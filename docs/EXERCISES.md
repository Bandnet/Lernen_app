# Writing exercise files (JSON)

Exercises are imported as one `.json` file per learning topic (Aufgaben tab → *Choose file*).
A complete example is in [`examples/exercises-example.json`](../examples/exercises-example.json).

## File structure

```json
{
  "version": 1,
  "title": "Zellaufbau Aufgaben",
  "exercises": [ { ... }, { ... } ]
}
```

| Field       | Required | Description |
|-------------|----------|-------------|
| `version`   | no       | Format version. Currently `1` (assumed when missing). |
| `title`     | no       | Name of the exercise set (defaults to the file name). |
| `exercises` | **yes**  | List of exercises (1–500). A bare list `[ ... ]` is accepted too. |

## Fields shared by every exercise

| Field         | Required | Description |
|---------------|----------|-------------|
| `type`        | **yes**  | `multiple_choice`, `true_false` or `text_input`. |
| `question`    | **yes**  | The question text (max. 2000 characters). |
| `id`          | no       | Unique text/number. Generated (`q1`, `q2`, …) when missing. Duplicates are rejected. |
| `explanation` | no       | Shown after answering (max. 4000 characters). |

## `multiple_choice`

One correct option.

```json
{
  "type": "multiple_choice",
  "question": "Was ist die Aufgabe des Zellkerns?",
  "options": ["Energie erzeugen", "DNA enthalten", "Proteine abbauen", "Wasser speichern"],
  "answer": 1,
  "explanation": "Der Zellkern enthält die DNA."
}
```

* `options`: 2–8 texts.
* `answer`: **number** of the correct option, counting from **0** (`0` = first option).

## `true_false`

```json
{
  "type": "true_false",
  "question": "Pflanzenzellen besitzen Chloroplasten.",
  "answer": true
}
```

* `answer`: `true` or `false` (without quotes).

## `text_input`

The learner types the answer.

```json
{
  "type": "text_input",
  "question": "Wie nennt man Zellen ohne echten Zellkern?",
  "answer": "Prokaryoten",
  "acceptedAnswers": ["Prokaryot", "Prokaryotische Zellen"],
  "caseSensitive": false
}
```

* `answer`: the correct answer (shown when the learner is wrong).
* `acceptedAnswers` (optional): more answers that count as correct.
* `caseSensitive` (optional, default `false`).
* Comparison ignores capitalisation, surrounding spaces, repeated spaces and punctuation at the
  beginning/end (`" photosynthese. "` = `Photosynthese`). Umlauts and accents still matter.

## Errors

Invalid files are rejected with a message that names the exercise number, for example
*"Aufgabe 3: „answer“ muss die Nummer einer Antwortmöglichkeit sein"*. Nothing is imported
unless the whole file is valid. Limits: file size 2 MB, 500 exercises.

## For developers: adding a new exercise type

1. Add an interface to `src/exercises/model.ts` and to the `Exercise` union.
2. Create `src/exercises/types/<name>.tsx` exporting an `ExerciseTypeDefinition`
   (`parse`, `initialAnswer`, `isAnswered`, `check`, `View`).
3. Register it in `src/exercises/registry.ts`.
4. Add its label to `src/i18n/translations.ts`.

The session, import validation and overview pick the new type up automatically.
