#!/usr/bin/env bash
# LT-6: one encrypted, restore-tested dump of the app's database.
#
#   MONGODB_URI        source cluster (a read-only Atlas user is enough)
#   BACKUP_PASSPHRASE  gpg symmetric passphrase (AES-256); keep it in a password manager
#   RESTORE_URI        a THROWAWAY MongoDB (the workflow's service container); the
#                      dump is restored there under <db>_restorecheck to prove it works
#   OUT_DIR            where the .archive.gz.gpg lands (default: backups)
#   DB_NAME            default ihsan (the live database's real name, CLAUDE.md)
#   MONGO_IMAGE        image that carries mongodump/mongorestore/mongosh (default mongo:8)
#
# Nothing secret is printed: the URI and passphrase reach the tools through the
# environment, never the command line. Plaintext dumps are deleted on exit.
# Restoring by hand: ops/backup/README.md.
set -euo pipefail

: "${MONGODB_URI:?MONGODB_URI is not set}"
: "${BACKUP_PASSPHRASE:?BACKUP_PASSPHRASE is not set}"
: "${RESTORE_URI:?RESTORE_URI is not set (a throwaway MongoDB)}"
OUT_DIR="${OUT_DIR:-backups}"
DB_NAME="${DB_NAME:-ihsan}"
MONGO_IMAGE="${MONGO_IMAGE:-mongo:8}"
CHECK_DB="${DB_NAME}_restorecheck"
export DB_NAME CHECK_DB

if [ "${#BACKUP_PASSPHRASE}" -lt 20 ]; then
  echo "::error::BACKUP_PASSPHRASE must be at least 20 characters." >&2
  exit 1
fi

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
mkdir -p "$OUT_DIR"
STAMP="$(date -u +%Y-%m-%dT%H%MZ)"
OUT="$OUT_DIR/${DB_NAME}-${STAMP}.archive.gz.gpg"

# Runs a MongoDB tool from the image; the work dir is mounted at /work.
tool() {
  docker run --rm --network host \
    -e MONGODB_URI -e RESTORE_URI -e DB_NAME -e CHECK_DB \
    -v "$WORK":/work "$MONGO_IMAGE" sh -c "$1"
}

# Document counts per collection, one "name count" line each, sorted.
cat > "$WORK/count.js" <<'JS'
const d = db.getSiblingDB(process.env.DB);
d.getCollectionNames()
  .filter((n) => !n.startsWith('system.'))
  .sort()
  .forEach((n) => print(n + ' ' + d.getCollection(n).countDocuments({})));
JS

echo "1/4 Dumping $DB_NAME"
tool 'mongodump --uri="$MONGODB_URI" --db="$DB_NAME" --archive=/work/dump.archive --gzip --quiet'
tool 'DB="$DB_NAME" mongosh "$MONGODB_URI" --quiet --file /work/count.js' | { grep -E '^[^ ]+ [0-9]+$' || true; } > "$WORK/source.counts"
if [ ! -s "$WORK/source.counts" ]; then
  echo "::error::The source database has no collections; nothing to back up." >&2
  exit 1
fi

echo "2/4 Encrypting (gpg, AES-256)"
gpg --batch --no-symkey-cache --yes --quiet --pinentry-mode loopback --passphrase-fd 3 \
  --symmetric --cipher-algo AES256 --output "$OUT" "$WORK/dump.archive" 3<<<"$BACKUP_PASSPHRASE"
rm -f "$WORK/dump.archive"

echo "3/4 Test restore: decrypt the encrypted file and restore it into $CHECK_DB"
gpg --batch --no-symkey-cache --quiet --pinentry-mode loopback --passphrase-fd 3 \
  --decrypt --output "$WORK/check.archive" "$OUT" 3<<<"$BACKUP_PASSPHRASE"
tool 'mongorestore --uri="$RESTORE_URI" --archive=/work/check.archive --gzip --drop \
  --nsFrom="$DB_NAME.*" --nsTo="$CHECK_DB.*" 2>&1' > "$WORK/restore.log"
tool 'DB="$CHECK_DB" mongosh "$RESTORE_URI" --quiet --file /work/count.js' | { grep -E '^[^ ]+ [0-9]+$' || true; } > "$WORK/restored.counts"
tool 'mongosh "$RESTORE_URI" --quiet --eval "db.getSiblingDB(process.env.CHECK_DB).dropDatabase()"' > /dev/null

failed="$(grep -oE '[0-9]+ document\(s\) failed' "$WORK/restore.log" | grep -oE '^[0-9]+' || echo 0)"
restored="$(grep -oE '[0-9]+ document\(s\) restored' "$WORK/restore.log" | grep -oE '^[0-9]+' || echo 0)"
echo "    restored $restored documents, $failed failed"
if [ "$failed" != "0" ]; then
  echo "::error::$failed documents failed to restore." >&2
  exit 1
fi

# Every collection must come back. Counts are compared but only reported: the
# live app may write between the dump and the count.
missing="$(comm -23 <(cut -d' ' -f1 "$WORK/source.counts") <(cut -d' ' -f1 "$WORK/restored.counts"))"
if [ -n "$missing" ]; then
  echo "::error::Collections missing after restore: $(echo "$missing" | tr '\n' ' ')" >&2
  exit 1
fi
if ! diff -q "$WORK/source.counts" "$WORK/restored.counts" > /dev/null; then
  echo "::notice::Some counts moved during the dump (live writes):"
  diff "$WORK/source.counts" "$WORK/restored.counts" || true
fi
echo "    $(wc -l < "$WORK/restored.counts") collections restored"

echo "4/4 Done: $OUT ($(du -h "$OUT" | cut -f1))"
sha256sum "$OUT" | tee "$OUT.sha256"
