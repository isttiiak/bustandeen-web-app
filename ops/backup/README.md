# Database backups (LT-6)

Atlas M0 (free) has no backups and no point-in-time restore, and local dev writes
to the live database. So once a week a GitHub Action makes an **encrypted**
`mongodump` of the `ihsan` database, **restores it into a throwaway MongoDB to prove
it opens**, and commits the encrypted file to a **private** repo.

| What                                 | Where                                                                                                                                 |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| Script (dump, encrypt, test restore) | `ops/backup/backup.sh` (this public repo)                                                                                             |
| Weekly workflow                      | private repo `isttiiak/bustandeen-backups`, `.github/workflows/backup.yml` (a reviewed copy is `ops/backup/backup-workflow.yml` here) |
| Backups                              | private repo, `backups/ihsan-<UTC time>.archive.gz.gpg` + `.sha256`; newest 12 in the tree, older ones in git history                 |
| Self-test without secrets            | `.github/workflows/backup-selftest.yml` (runs when `ops/backup/` changes)                                                             |

Why a private repo: this repo is public, so its Action logs and artifacts are public,
and GitHub turns off a public repo's schedules after 60 days without a commit. A
private repo's schedule keeps running, and every backup is a commit anyway.
GitHub emails you when a scheduled run fails.

The file is `gzip` inside `gpg` (AES-256, symmetric). Without the passphrase it is
useless, so **the passphrase lives in your password manager, not only in GitHub.**
If it is lost, every backup is lost with it.

---

## One-time setup (Istiak)

1. **Atlas read-only user.** Atlas > Database Access > Add New Database User:
   name `backup-reader`, a generated password, role **Only read any database**
   (or Specific privileges: `read` on `ihsan`). Copy its connection string
   (Atlas > Connect > Drivers) and put the user/password in it. Network Access
   already allows the app's serverless functions; GitHub's runners need the same
   (they have changing IPs).
2. **Passphrase.** Make a long random one (30+ characters) and save it in your
   password manager as "Bustandeen backup passphrase".
3. **Private repo** (`gh` in PowerShell, one line each):
   ```
   gh repo create isttiiak/bustandeen-backups --private --description "Encrypted weekly database backups"
   ```
   Then add the workflow: copy `ops/backup/backup-workflow.yml` to
   `.github/workflows/backup.yml` in that repo and push.
4. **Secrets** in the private repo (each command asks for the value; paste it):
   ```
   gh secret set MONGODB_URI -R isttiiak/bustandeen-backups
   gh secret set BACKUP_PASSPHRASE -R isttiiak/bustandeen-backups
   ```
5. **First run:** `gh workflow run backup.yml -R isttiiak/bustandeen-backups`, then
   `gh run watch -R isttiiak/bustandeen-backups`. The log must end with
   `restored N documents, 0 failed` and `Done: backups/ihsan-....archive.gz.gpg`.

---

## Restore (tested)

Every weekly run already decrypts its own file and restores it into a throwaway
MongoDB (`<db>_restorecheck`), checks that no document failed and every
collection came back, then drops it. CI's self-test does the same on seeded data.
To restore by hand:

**Tools:** `gpg` comes with Git for Windows (`C:\Program Files\Git\usr\bin\gpg.exe`,
or just `gpg` in Git Bash). `mongorestore` is in the MongoDB Database Tools
(mongodb.com/try/download/database-tools, zip, add its `bin` to PATH).

1. Get the file: `gh repo clone isttiiak/bustandeen-backups` (or download one file
   from GitHub). Check it: `sha256sum -c backups/<file>.sha256` (Git Bash).
2. Decrypt (asks for the passphrase):
   ```
   gpg --output ihsan.archive.gz --decrypt backups/ihsan-2026-10-17T2100Z.archive.gz.gpg
   ```
3. **Restore beside the live data first**, into `ihsan_restore`, and look at it
   (Compass or mongosh) before touching anything live:
   ```
   mongorestore --uri "<admin connection string>" --archive=ihsan.archive.gz --gzip --nsFrom "ihsan.*" --nsTo "ihsan_restore.*"
   ```
4. Then, only what is needed:
   - **One collection** (e.g. salat logs lost):
     `mongorestore --uri "<...>" --archive=ihsan.archive.gz --gzip --nsInclude "ihsan.salatlogs" --drop`
   - **Everything** (cluster lost; a new cluster's connection string in Vercel first):
     `mongorestore --uri "<...>" --archive=ihsan.archive.gz --gzip --drop`
     `--drop` replaces the collection with the backup: anything written after the
     backup's time is gone. Indexes come back with the data.
5. Drop `ihsan_restore` afterwards (it counts toward the M0 512 MB cap), and delete
   the decrypted `ihsan.archive.gz`: it is the whole database in plain form
   (including users' emails; Rayhanah fields stay encrypted with FIELD_ENCRYPTION_KEY,
   so keep that key too, or Rayhanah data cannot be read after a restore).
