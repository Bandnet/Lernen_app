# The `.learn` file format

A `.learn` file is one ZIP archive that contains a complete learning topic.
Rename it to `.zip` to look inside.

```
Biologie_Zellaufbau.learn
├── manifest.json      (required)
├── summary.pdf        or  summary.html
├── assets/001.png …   images / CSS / fonts used by summary.html
└── exercises.json     same format as docs/EXERCISES.md
```

## manifest.json

```json
{
  "format": "learn-topic",
  "formatVersion": 1,
  "exportedAt": "2026-09-20T12:00:00.000Z",
  "subject": { "name": "Biologie" },
  "topic": { "name": "Zellaufbau", "description": "…", "icon": "🧬", "color": "#22c55e" },
  "summary": {
    "type": "html",
    "file": "summary.html",
    "fileName": "zellaufbau.html",
    "assets": [{ "path": "Bild 1.png", "file": "assets/001.png", "mimeType": "image/png" }]
  },
  "exercises": { "file": "exercises.json" }
}
```

`summary` and `exercises` may be `null`. `assets[].path` is the name the HTML uses to refer
to the file; `assets[].file` is where it is stored in the archive.

## Import rules

* The subject is matched by name (case-insensitive) or created; the topic is always added as a
  new topic (`Name (2)` if the name exists already). Nothing is overwritten.
* Only the file names listed above are read. Everything else in the archive is ignored.
* Size limits are checked before anything is unpacked: PDF 50 MB, HTML 10 MB, assets 40 MB,
  exercises 2 MB, manifest 1 MB, whole file 120 MB.
* The manifest, the summary (PDF signature, HTML sanity check) and the exercises go through
  the same validation as a normal import. The whole import is all-or-nothing.
* Imported HTML is displayed in a sandboxed frame without scripts (see README).
