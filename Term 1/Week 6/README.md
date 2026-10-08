# Term 1 - Week 6: Language Models

---

## 1. Homework & workshop assignments -> [`homework/`](homework/)

**What was the assignment?**

**What did I hand in?**
_List the files, or link to them. Notebook exports, screenshots, scripts._

**What did I find difficult, and how did I solve it?**

### Checklist
- [ ] My workshop / homework files are in `homework/`
- [ ] Everything runs without errors, or I explained what does not and why

---


## 2. Hackathon prototype -> [`hackathon/`](hackathon/)

> Your tool and your SDG for this hackathon are announced at the **start of Friday's class**.
> Write them down here once you know them.

**Project title:**

**My pair partner:**

# Fair-pay checker: is a worker paid above the median for their job and state?

**Hackathon 5 "Model Showdown" · AI for Good · SDG 8 – Decent Work and Economic Growth (target 8.5: equal pay for work of equal value)**

Notebook: [`fair_pay_checker.ipynb`](fair_pay_checker.ipynb) · Comparison table: [`comparison_table.csv`](comparison_table.csv)

## The problem

In the US, women working full-time, year-round earned **83%** of men's median earnings in 2024. Within some occupation groups the figure is **74%**
([US Census Bureau, Equal Pay Day 2026](https://www.census.gov/newsroom/stories/equal-pay-day.html)). Part of that gap sits *within* the same job.
Most workers, however, do not know what similar workers in their job and state earn, so they cannot tell whether their own pay is unusually low.

**Prediction.** For a US wage or salary worker (18–64, employee, not self-employed), predict whether their **hourly wage is above the median hourly wage of the same detailed
occupation in the same state**. The prediction uses only job-related information: occupation, industry group, age, education, usual hours, weeks worked and type of employer.
Sex, race and citizenship are *not* model inputs; they are used only to audit the model.

## User and decision

* **User:** a worker-advice centre or union confederation serving members in many sectors.
* **Decision:** whether to raise a *"you may be underpaid"* signal for a member and offer help with a pay negotiation. The signal is raised when the model says
  *people with this profile are usually above the median* (probability ≥ 0.77) but the member actually earns **below** the median.
* **Affected people:** the members the signal is about. A wrong signal can push someone into a failed negotiation or a bad job switch. A missed signal leaves someone underpaid.
* **Not represented:** self-employed and informal workers, people under 18 or over 64, armed forces, people outside the US, and workers in occupations with fewer than 30 survey respondents in
  their state. In small states (Vermont, Alaska, Wyoming) 70–80% of workers are not covered.

## Why SDG 8

SDG target 8.5 asks for "equal pay for work of equal value". The tool compares a worker with others doing the *same* job in the *same* state, and it gives advisers a concrete,
data-based reason to look at a member's pay. It does not address all of SDG 8, only one specific outcome (hourly pay relative to the occupation median) for one specific group (US employees).

## Dataset card

| | |
|---|---|
| **Name** | American Community Survey (ACS) 2024 1-year Public Use Microdata Sample (PUMS), person file, whole US |
| **Source / link** | US Census Bureau, <https://www2.census.gov/programs-surveys/acs/data/pums/2024/1-Year/csv_pus.zip> (575 MB); data dictionary: <https://www2.census.gov/programs-surveys/acs/tech_docs/pums/data_dict/PUMS_Data_Dictionary_2024.csv> |
| **Who, how, when** | Collected by the US Census Bureau through the ACS, a mandatory household survey by mail, internet, phone and in person, run continuously during calendar year 2024. Wages refer to the 12 months before the interview. Current files on census.gov are dated December 2025. |
| **Population** | Persons in US housing units and group quarters (all 50 states + DC); PUMS is a ~1% sample of the population. |
| **Licence** | Public domain (work of the US federal government). The Census Bureau protects confidentiality by sampling, swapping records, top-coding extreme values and removing names and addresses. Respondents were required by law to answer, but they were not asked about this specific use. |
| **Size** | Raw: 3,422,888 persons, 286 columns (17 loaded). After population filters: 1,268,428 workers. After the coverage rule: ~1.09M workers (train ~872k, test ~217k), of which fixed samples of 20,000 (tuning) and 50,000 (test) are used for modelling. |
| **Features (8)** | `AGEP` age, `SCHL` education (ordered code 1–24), `WKHP` usual hours/week, `WKWN` weeks worked, `OCCP` detailed occupation (525), occupation group (24), industry group (17), `COW` class of worker (5). |
| **Target** | 1 = hourly wage (`WAGP × ADJINC / (WKHP × WKWN)`) above the training-set median of its state × occupation cell; 0 otherwise. Class balance: 49.1% positive (train), 49.2% (test). Not balanced per group: 45.5% of women vs 52.6% of men, 43.1% of Hispanic and 46.2% of Black workers vs 50.9% of White workers. |
| **Audit-only columns** | `SEX`, `RAC1P` + `HISP` (race/ethnicity), `CIT` (citizenship). |
| **Filters (rows dropped)** | age 18–64 (−1,445,925) · civilian employed (−547,370) · employee, COW 1–5 (−139,340) · wages > 0 (−0) · > 4 weeks worked (−10,414) · > 5 hours/week (−8,350) · hourly wage ≥ $2 (−3,061). Cells with < 30 training workers are "not covered" (~14% of workers). |
| **Known limitations** | Self-reported yearly wages, hours and weeks, so the hourly wage is an approximation. The occupation is the *current* job but wages cover the past 12 months (job changers). Wages are top-coded. No information on employer, tenure, performance, union membership or collective agreements. Survey weights (`PWGTP`) are not used: the model is evaluated on individual respondents, not on population totals. One year, US only. |

## Method in short

1. Download and load (17 columns), filter the population and record each dropped row count, compute the hourly wage.
2. **Split first:** 80/20 by household (`GroupShuffleSplit` on `SERIALNO`, `random_state=42`), so housemates are never split between train and test.
3. Medians per state × occupation computed on the **training set only**; cells with < 30 training workers are "not covered". The same medians label the test set.
4. All pre-processing in one `ColumnTransformer` inside a `Pipeline` (standard scaling of numbers, one-hot encoding of categories).
5. Baselines: `DummyClassifier` (most frequent, and "always above") and a one-feature rule (depth-1 decision tree).
6. Tuning with `GridSearchCV` on the 20k tuning sample, with the **same 5 folds** (`StratifiedGroupKFold`, grouped by household) and the **same metric (ROC-AUC)** for all models.
7. One evaluation on the 50k test sample; error analysis per age, hours, sex, race/ethnicity, citizenship and sector; proxy check; strict signal threshold chosen on out-of-fold training predictions.

**Why the 30-worker rule comes before the 20k sample:** the rule makes each *median* (and so each label) reliable, so it needs the full training set (~870k workers; on 20k there would be ~3 workers per cell).
The models do not compute per-cell medians and learn mostly from age, education and hours, so they can be fitted on a sample. We checked the cost: 22 of 409 covered occupations do not appear in the
20k sample (0.1% of test workers), and workers in occupations seen only 1–9 times score ROC-AUC 0.68 against 0.69–0.70 for common occupations, a difference within normal variation.

**Main metric: ROC-AUC.** The tool outputs a probability, and the signal is raised only above a strict threshold. ROC-AUC measures whether a higher probability really means "more likely above the median".
We first chose F1, but with ~50% positives a rule that says "above" to *everyone* already gets F1 = 0.66, more than every real model, while being useless. ROC-AUC gives such a rule 0.5.

## Comparison table (test sample n = 50,000; CV = 5 folds on the 20,000 tuning sample)

| Model | Best hyperparameters | CV ROC-AUC (mean ± sd) | Test ROC-AUC | Test precision | Test recall | Test F1 |
|---|---|---|---|---|---|---|
| **Baseline:** Dummy (most frequent) | – | 0.500 ± 0.000 | 0.500 | 0.000 | 0.000 | 0.000 |
| Dummy (always "above") | – | 0.500 ± 0.000 | 0.500 | 0.495 | 1.000 | 0.662 |
| Single threshold on one feature (depth-1 tree) | – | 0.587 ± 0.008 | 0.589 | 0.554 | 0.834 | 0.666 |
| KNN | n_neighbors = 101 | 0.662 ± 0.009 | 0.664 | 0.605 | 0.662 | 0.632 |
| Logistic regression | C = 0.1 | 0.645 ± 0.008 | 0.647 | 0.607 | 0.594 | 0.600 |
| **HistGradientBoosting** | learning_rate = 0.1, max_leaf_nodes = 31 | **0.688 ± 0.012** | **0.694** | 0.629 | 0.657 | 0.643 |

Precision, recall and F1 are at the default threshold of 0.5. At the recommended **signal threshold of 0.77**, HistGradientBoosting reaches test precision **0.79** at recall 0.07.
KNN struggles with the ~430 one-hot columns, mostly from the detailed occupations: every pair of different occupations is equally far apart, so occupation adds noise to its distances.

## Recommended model

**HistGradientBoosting, as a triage aid for human advisers, with the signal threshold of 0.77.** It has the best ROC-AUC in CV and on test. The gap to KNN (0.026) and logistic regression (0.043)
is larger than the spread over the folds, and CV matched test. It is less explainable than logistic regression. That is acceptable because the output is a reason for an adviser to look closer, not a decision,
and the adviser can always show the member the two numbers behind it: the cell median and the member's own wage.
In absolute terms the model is modest (ROC-AUC 0.69): a job profile explains only part of who earns above the median.

**Do not use this model** to tell anyone they *are* underpaid, as evidence in a negotiation or court, for people outside the covered population (self-employed, under 18 / over 64,
occupation "not covered" in their state, outside the US), or by employers to set or judge pay.

## Ethical reflection

The data are ACS 2024 responses from US residents of working age who are employed by someone else. Missing are the self-employed and informal workers (often the most precarious), anyone outside the US,
and workers in rare jobs or small states: in Vermont, Alaska and Wyoming 70–80% of workers fall in cells too small to be covered. Respondents had to answer by law, and the data are public domain and anonymised,
but nobody was asked whether their answers may be used to judge other people's pay.

The model learns *existing* pay patterns, including unfair ones. If a whole occupation is underpaid (e.g. care work), its median is low too, and the tool cannot see that. It only compares workers *within* an occupation.
We removed sex, race and citizenship from the inputs, but they are still hiding in the features. From occupation, industry, hours and education alone, a simple model recognises women with ROC-AUC 0.81 and non-citizens with 0.72.

The errors are not spread evenly. With the strict threshold, 75% of signals are correct for women against 83% for men, and 72% for non-citizens. This is double-edged. Women, whom the model cannot see,
are predicted "above" as often as their job profile suggests, but fewer of them actually are. Statistically these are "false positives", yet they are partly the very equal-pay gap the tool is meant to expose.
Hispanic workers get the opposite error: the model rarely predicts them above the median, so they would receive fewer signals. The strongest signals go to highly educated people in low-paid jobs,
where the cause may be over-qualification rather than underpayment.

A false positive (a wrong "you may be underpaid") can lead a worker into a failed negotiation, a damaged relationship with an employer or a bad job switch. A false negative leaves an underpaid worker without help.

**What we did:**
1. We dropped F1 for ROC-AUC, because F1 rewarded a useless "always above" rule.
2. We raised the signal only at probability ≥ 0.77, chosen on training data, so that about 4 in 5 signals are right.
3. We audited errors per sex, race/ethnicity, citizenship and sector, and report the remaining gaps instead of hiding them.
4. The tool refuses to predict for cells with fewer than 30 comparable workers.
5. This README states who the model must not be used for.

The output is a **signal for a conversation with an adviser, not proof**: the model cannot see performance, the employer, tenure, collective agreements or negotiation.

## How to run

* **Google Colab:** upload `fair_pay_checker.ipynb` and choose *Runtime → Run all*. No extra installs are needed; everything used is preinstalled in Colab.
  The first run downloads 575 MB from census.gov into `data/` (several minutes; census.gov limits download speed). Then tuning and evaluation take roughly 15–25 minutes on Colab's 2 CPUs.
* **Locally:** Python 3.10+ with the packages below, then `jupyter notebook fair_pay_checker.ipynb` → *Restart and Run All* (~7 minutes on a 12-core laptop after the download).
  About 4 GB of free RAM is needed while loading.
* The notebook was last run end to end with **Python 3.13, pandas 2.2.3, numpy 2.4, scikit-learn 1.6.1, matplotlib 3.11** (versions printed in the first code cell).
  It only uses scikit-learn features available since version 1.2.
* All randomness uses `random_state=42`, so the numbers above are reproduced exactly.
* `data/` is git-ignored; the notebook downloads into it.

### Checklist
- [ ] Prototype code (or export / workflow file) is in `hackathon/`
- [ ] This week's slides are in `hackathon/`
- [ ] The prototype actually runs, and I wrote down how to run it
- [ ] Ethical reflection written above

---

## 3. Presentation -> [`presentation/`](presentation/)

*Only fill this in for the week your group was selected to present. You need at least **one** of these across the whole term.*

- [ ] My group presented in this week
- [ ] Slides are in `presentation/`
- [ ] Proof of the live demo is in `presentation/` (recording, screenshots, or link)

**How did it go? What would I do differently next time?**

---

## 4. Reflection

**What is the most important thing I learned this week?**

**Where does this connect to "AI for Good"?**
_One concrete link to ethics, sustainability or social impact._
