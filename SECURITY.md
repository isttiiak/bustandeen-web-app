# Security Policy

Bustandeen handles personal worship data (salat, zikr, Quran, fasting, and cycle
tracking) for real users. We take reports of security vulnerabilities
seriously and appreciate responsible disclosure.

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Instead, email **isttiiak@gmail.com** with:

- A description of the vulnerability and its potential impact
- Steps to reproduce (proof-of-concept code or requests are welcome)
- The affected component (frontend, backend/API, or infrastructure)

You should receive an acknowledgment within a few days. We'll keep you
updated as we investigate and work on a fix.

## Disclosure Timeline

We ask that you give us **90 days** from the initial report before publicly
disclosing the vulnerability, to give us time to investigate, fix, and
deploy a patch. If a fix ships before the 90 days are up, we're happy to
coordinate an earlier disclosure with you.

## Scope

This policy covers:

- The Bustandeen web app frontend (React/Vite)
- The Bustandeen backend API (Express, deployed as a Vercel serverless function)

It does not cover third-party services Bustandeen depends on (Firebase, MongoDB
Atlas, Vercel) - please report those directly to the respective vendor.

## Supported Versions

Bustandeen is a continuously-deployed web app with a single production version -
only the latest release is supported. There is no need to specify a version
in your report.
