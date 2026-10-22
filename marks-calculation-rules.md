# School App 2026-27 — Marks Calculation Rules

Source: `Subjects_Marks_For_School_App_2026-27.xlsx` (6 sheets). Every subject row in every sheet was parsed and checked cell by cell against the rules below (internal max + exam max = term max, term I + term II = grand total, component maxes, and the "Divided by 3 / Divided by 2 / No Division" cell comments in the sheet). Everything checks out. The rules are **config-driven**: do not hard-code subject names or classes in the calculation code. Load `marks-config.json` and look up the scheme for each subject.

---

## 1. The one formula that applies everywhere

Every subject, in every class, is calculated the same way. Only the numbers (maxes and divisor) change per **scheme**.

```
For each Term (Term-I uses F.A.1/F.A.2, Term-II uses F.A.3/F.A.4):

  internalRaw     = sum of all APPLICABLE internal components entered
                    (F.A. x2, + Assignment/Dictation + Oral/Practical/Game where the scheme has them)
  internalScaled  = internalRaw / internalDivisor          <- the "Total" column in the sheet
  examMarks       = Half Yearly (Term-I)  or  Annual Exam (Term-II)   (entered directly, out of examMax)
  termTotal       = internalScaled + examMarks

grandTotal (subject) = termTotal(Term-I) + termTotal(Term-II)
studentTotal         = sum of grandTotal over the subjects the student is enrolled in
percentage           = studentTotal / sum of grandMax of the same subjects * 100
```

`internalDivisor = internalRawMax / internalMax`. This is the "Divided by 3 / Divided by 2" note in the sheet. Compute it from the config; never type 3 or 2 into code.

Important: the internal marks are **entered raw** (F.A.1 out of 20, F.A.2 out of 20, Assignment out of 10, Oral out of 10 = 60) and **scaled down**. The sheet's "Total" column (20 or 30) is the scaled value, not the sum of the four raw columns.

---

## 2. The six schemes

| Scheme ID | Internal components (raw max) | Raw sum | Divisor | Internal (scaled) | Exam | Term max | Subject grand max |
|---|---|---|---|---|---|---|---|
| `STD_80_20` | F.A.1 20 + F.A.2 20 + Assignment 10 + Oral/Practical/Game 10 | 60 | ÷ 3 | 20 | 80 | 100 | 200 |
| `PRACTICAL_70_30` | F.A.1 20 + F.A.2 20 + Assignment 10 + Oral/Practical/Game 10 | 60 | ÷ 2 | 30 | 70 | 100 | 200 |
| `HALF_30_20` | F.A.1 20 + F.A.2 20 + Assignment 10 + Oral/Practical/Game 10 | 60 | ÷ 3 | 20 | 30 | 50 | 100 |
| `DRAWING_30_20` | F.A.1 20 + F.A.2 20 only (Assignment, Oral = NA) | 40 | ÷ 2 | 20 | 30 | 50 | 100 |
| `EARLY_60_40` | F.A.1 20 + F.A.2 20 + Dictation 20 + Oral 20 | 80 | ÷ 2 | 40 | 60 | 100 | 200 |
| `EARLY_NO_DIV_60_40` | F.A.1 20 + F.A.2 20 only (Dictation, Oral = NA) | 40 | ÷ 1 (no division) | 40 | 60 | 100 | 200 |

Notes:
- Term-I and Term-II use the **same** scheme for a given subject. Only the labels differ (F.A.1/F.A.2 vs F.A.3/F.A.4; Half Yearly vs Annual Exam).
- "NA" in the sheet means the component does **not exist** for that subject: do not show an input for it, exclude it from `internalRaw` and `internalRawMax`.
- `HALF_30_20` and `DRAWING_30_20` subjects are worth 100 in total (50 per term), not 200. They add 100 to the student total, not 200.

---

## 3. Class → subject → scheme (this is where classes differ)

### NUR, LKG, UKG

| Scheme | Subjects | Subject max (each) |
|---|---|---|
| `EARLY_60_40` | English Written, English Oral, English Dictation, Hindi Written, Hindi Oral, Hindi Dictation, Maths Written, Maths Oral | 200 |
| `EARLY_NO_DIV_60_40` | E.V.S., Drawing | 200 |

If a student takes every listed subject: **2000** total max.

### Class 1 & 2

| Scheme | Subjects | Subject max (each) |
|---|---|---|
| `STD_80_20` | English-I, English-II, Hindi, Maths, E.V.S. | 200 |
| `HALF_30_20` | G.K., Computer | 100 |
| `DRAWING_30_20` | Drawing | 100 |

If a student takes every listed subject: **1300** total max.

### Class 3, 4, 5

| Scheme | Subjects | Subject max (each) |
|---|---|---|
| `STD_80_20` | English-I, English-II, Hindi, Maths, Science, Social Studies | 200 |
| `HALF_30_20` | Sanskrit, G.K., Computer | 100 |
| `DRAWING_30_20` | Drawing | 100 |

If a student takes every listed subject: **1600** total max.

### Class 6, 7, 8

| Scheme | Subjects | Subject max (each) |
|---|---|---|
| `STD_80_20` | English-I, English-II, Hindi, Maths, Physics, Chemistry, Biology, History & Civics, Geography | 200 |
| `HALF_30_20` | Sanskrit, G.K., Computer | 100 |
| `DRAWING_30_20` | Drawing | 100 |

If a student takes every listed subject: **2200** total max.

### Class 9 & 10

| Scheme | Subjects | Subject max (each) |
|---|---|---|
| `STD_80_20` | English-I, English-II, Hindi, Maths, Physics, Chemistry, Biology, History & Civics, Geography, Physical Education | 200 |

If a student takes every listed subject: **2000** total max.

### Class 11 & 12

| Scheme | Subjects | Subject max (each) |
|---|---|---|
| `STD_80_20` | English-I, English-II, Hindi, Maths, History & Civics, Political Science, Commerce, Accounts, Economics | 200 |
| `PRACTICAL_70_30` | Physics, Chemistry, Biology, Physical Education | 200 |

The sheet lists 13 subjects, but a student takes only a combination of them (Science / Commerce / Arts style). Total max is **the sum of the enrolled subjects' grand max**, not 2600.

### Where subjects inside the same class calculate differently

| Class | Different rule | Why it matters |
|---|---|---|
| 11 & 12 | **Physics, Chemistry, Biology, Physical Education** use `PRACTICAL_70_30` (internal ÷ 2 = 30, exam 70). All other subjects use `STD_80_20` (÷ 3 = 20, exam 80). | Same four raw components, different divisor and exam max. Term max is 100 for both. |
| 9 & 10 | None. All 10 subjects are `STD_80_20`. Physics/Chemistry/Biology/Physical Education are **not** 70/30 here. | Do not copy the 11-12 rule down. |
| 6 to 8 | **Sanskrit, G.K., Computer** use `HALF_30_20` (exam 30, subject max 100). **Drawing** uses `DRAWING_30_20` (only F.A.1 + F.A.2, ÷ 2). The other 9 subjects use `STD_80_20`. | Three different rules in one class. |
| 3 to 5 | Same pattern as 6-8: Science, Social Studies, English-I/II, Hindi, Maths are `STD_80_20`. Sanskrit, G.K., Computer are `HALF_30_20`. Drawing is `DRAWING_30_20`. | Science and Social Studies are single subjects here. |
| 1 & 2 | E.V.S. is `STD_80_20`. G.K. and Computer are `HALF_30_20`. Drawing is `DRAWING_30_20`. | Same pattern. |
| NUR–UKG | **E.V.S. and Drawing** use `EARLY_NO_DIV_60_40` (F.A.1 + F.A.2 only, **no division**, internal = 40 directly). The other 8 subjects use `EARLY_60_40` (4 components = 80, ÷ 2 = 40). | The only place where internal marks are not divided. |

---

## 4. Rules for entry values

- Every entered mark must satisfy `0 <= mark <= component max` (and `0 <= exam <= examMax`). Reject anything else.
- `NA` components are never enterable and never counted.
- **Absent (`AB`)** is stored as a status, not as 0, and counts as 0 in totals.
- A missing (empty) entry is **not** 0. A subject term is only "complete" when every applicable component and the exam have a value or `AB`. Show incomplete results as "pending" and do not rank or compute final percentage until all are complete.
- Recalculate on the server from raw entries. Never trust a client-sent total.

## 5. Rounding

Not defined in the sheet. The code uses one setting in the config (`rounding`): `internalScaled` is rounded **half-up to 2 decimals** (so 50 ÷ 3 = 16.67) and nothing else is rounded. Keep it in one function so it can be changed later.

---

## 6. Reference implementation (TypeScript)

Tested against the worked examples in section 7.

```ts
export type MarkEntry = number | "AB" | "NA" | null;

export interface SchemeComponent { term1Key: string; term2Key: string; max: number; name?: string }
export interface Scheme {
  id?: string;
  components: SchemeComponent[];
  internalRawMax: number;
  internalMax: number;
  internalDivisor?: number;
  examMax: number;
  termMax: number;
  subjectMax: number;
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export interface TermInput {
  components: Record<string, MarkEntry>; // keys: fa1/fa2/assignment/oral (term1) or fa3/fa4/... (term2)
  exam: MarkEntry;                       // half-yearly (term1) or annual (term2)
}

export interface TermResult {
  internalRaw: number;
  internalScaled: number;
  exam: number;
  termTotal: number;
  termMax: number;
  complete: boolean;
}

export function calcTerm(scheme: Scheme, term: 1 | 2, input: TermInput): TermResult {
  let raw = 0;
  let complete = true;
  for (const c of scheme.components) {
    const key = term === 1 ? c.term1Key : c.term2Key;
    const v = input.components ? input.components[key] : null;
    if (v === null || v === undefined) { complete = false; continue; }
    if (v === "AB" || v === "NA") continue;            // counts as 0
    const num = typeof v === 'string' ? Number(v) : v;
    if (isNaN(num) || num < 0 || num > c.max) throw new Error(`${key} must be between 0 and ${c.max}`);
    raw += num;
  }
  const ex = input.exam;
  let exam = 0;
  if (ex === null || ex === undefined) complete = false;
  else if (ex !== "AB" && ex !== "NA") {
    const numEx = typeof ex === 'string' ? Number(ex) : ex;
    if (isNaN(numEx) || numEx < 0 || numEx > scheme.examMax) throw new Error(`exam must be between 0 and ${scheme.examMax}`);
    exam = numEx;
  }
  const divisor = scheme.internalDivisor || (scheme.internalRawMax / scheme.internalMax);
  const internalScaled = round2(raw / divisor);
  return { internalRaw: raw, internalScaled, exam, termTotal: round2(internalScaled + exam), termMax: scheme.termMax, complete };
}

export function calcSubject(scheme: Scheme, t1: TermInput, t2: TermInput) {
  const r1 = calcTerm(scheme, 1, t1);
  const r2 = calcTerm(scheme, 2, t2);
  return { term1: r1, term2: r2, grandTotal: round2(r1.termTotal + r2.termTotal), grandMax: scheme.subjectMax, complete: r1.complete && r2.complete };
}

export function calcStudent(subjects: ReturnType<typeof calcSubject>[]) {
  const obtained = round2(subjects.reduce((a, s) => a + s.grandTotal, 0));
  const max = subjects.reduce((a, s) => a + s.grandMax, 0);
  return { obtained, max, percentage: max ? round2((obtained / max) * 100) : 0 };
}
```

---

## 7. Test cases (all verified against the code above)

| # | Scheme | Term-I entries | Term-II entries | Expected |
|---|---|---|---|---|
| 1 | `STD_80_20` | F.A.1 18, F.A.2 15, Asg 8, Oral 9, Half Yearly 62 | 20, 20, 10, 10, Annual 70 | T-I internal 50÷3 = **16.67**, T-I total **78.67**, T-II total **90**, grand **168.67 / 200** |
| 2 | `PRACTICAL_70_30` | same four entries, Half Yearly 55 | 20, 20, 10, 10, Annual 60 | T-I internal 50÷2 = **25**, T-I total **80**, T-II total **90**, grand **170 / 200** |
| 3 | `HALF_30_20` | 12, 14, 6, 7, Half Yearly 24 | 20, 20, 10, 10, Annual 30 | T-I internal **13**, T-I total **37**, grand **87 / 100** |
| 4 | `DRAWING_30_20` | F.A.1 17, F.A.2 19, Half Yearly 25 | F.A.3 15, F.A.4 20, Annual 28 | T-I internal 36÷2 = **18**, T-I total **43**, T-II internal **17.5**, grand **88.5 / 100** |
| 5 | `EARLY_60_40` | 15, 16, Dictation 18, Oral 17, Half Yearly 48 | 20, 20, 20, 20, Annual 55 | T-I internal 66÷2 = **33**, T-I total **81**, grand **176 / 200** |
| 6 | `EARLY_NO_DIV_60_40` | 17, 18, Half Yearly 50 | 20, 20, Annual 52 | T-I internal **35** (no division), T-I total **85**, grand **177 / 200** |
| 7 | Student with #1 + #2 | | | obtained **338.67**, max **400**, **84.67 %** |
| 8 | `STD_80_20`, F.A.1 = AB | | Term-II empty | `internalRaw` = 32 (AB = 0), result flagged **incomplete** |
| 9 | `STD_80_20`, F.A.1 = 21 | | | rejected, must be 0 to 20 |

---

## 8. Problems found in the sheet (fix labels in the app, do not copy them)

1. **NUR–UKG, Term-II header** says "Internal Assessment-I" and uses "F.A. 1 / F.A. 2". It should be **Internal Assessment-II, F.A. 3 / F.A. 4** like every other class. The config uses F.A.3/F.A.4.
2. Sheet "1 & 2" and sheet "NUR to UKG" both have the title **"For Class 3rd to 5th"**. This is a copy-paste error. The config follows the sheet tab names.
3. Spelling in the sheet: "Assingment" → Assignment, "Ecomomics" → Economics, "Phyical Education" → Physical Education, "Divied" (comments).
4. Component 4 is labelled "Oral/Prc/Game" in some sheets and "Oral/Practical" in others. Use one label: **Oral / Practical / Game**.
5. In NUR–UKG, "Dictation" is both a **component** (column 3) and a **subject** (English Dictation, Hindi Dictation). Each of those subject rows still has its own F.A., Dictation and Oral components. Keep the component key `dictation` separate from the subject.
6. Sheet "6 to 8" lists Physics, Chemistry and Biology as separate 200-mark subjects, while "3 to 5" has a single Science. Check this is intended.
