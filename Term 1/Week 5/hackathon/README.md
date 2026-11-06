# Fair-pay checker

**Hackathon 5 "Model Showdown" · scikit-learn · SDG 8 – Decent Work and Economic Growth (target 8.5: equal pay for work of equal value)**

Notebook: [`fair_pay_checker.ipynb`](fair_pay_checker.ipynb) · Comparison table: [`comparison_table.csv`](comparison_table.csv)

## The problem

In the US, women working full-time earned **83%** of men's median earnings in 2024, and in some occupation groups only 74% ([US Census Bureau](https://www.census.gov/newsroom/stories/equal-pay-day.html)). Part of that gap sits *within the same job*: two people do the same work in the same state and one is paid less. Individual workers rarely know what comparable colleagues earn, so they cannot tell whether their own pay is unusually low. The gap stays invisible to the person it affects. SDG target 8.5 asks for *"equal pay for work of equal value"* for all women and men.

**The gap in our own data.** Within the same job in the same state, **45.5% of women earn above the median, against 52.6% of men**, and the typical woman earns **96.7%** of her job's median, the typical man **103.8%**.

## Who uses it, and for what

* **User:** the member-advice service of a US union confederation, which advises members in many sectors and states.
* **Decision:** whether to give a member a *"you may be underpaid"* signal and offer help with a pay negotiation.
* **Affected:** the members the signal is about.
* **Does the data match the users?** Yes: the data covers US employees in 2024, the same population as the union's members. It should not be used for workers in other countries.
* **Not represented in the data, so not for them:** self-employed and informal workers, people under 18 or over 64, workers outside the US, and workers in a job that fewer than 30 people in their state hold in the survey (in Vermont, Alaska and Wyoming that is 77–81% of workers).

## Why machine learning, and not a simple table?

A table of median wages per job and state tells a member whether they earn below the median. But that alone means little. A **24-year-old nurse** in Ohio earning below the median nurse is normal, because most nurses are older and more experienced. A **50-year-old nurse with a master's degree** earning below it is unusual. The table cannot tell these two apart.

The model can. It learns how age, education, hours, industry and type of employer affect pay, and estimates how likely it is that *people with this profile* earn above the median of their job in their state. If that is very likely (at least 4 in 5) but the member earns below it, the advice service has a reason to look closer.

## Dataset card

| | |
|---|---|
| **Source** | US Census Bureau, American Community Survey 2024 1-year Public Use Microdata Sample (PUMS), person file, whole US: [csv_pus.zip](https://www2.census.gov/programs-surveys/acs/data/pums/2024/1-Year/csv_pus.zip) (575 MB, downloaded by the notebook) and the [data dictionary](https://www2.census.gov/programs-surveys/acs/tech_docs/pums/data_dict/PUMS_Data_Dictionary_2024.csv) |
| **Collected** | By the Census Bureau, in a mandatory household survey (mail, internet, phone, in person) during 2024; wages refer to the past 12 months |
| **Licence** | Public domain (US federal government work), anonymised by the Census Bureau |
| **Size** | 3,422,888 persons; 1,268,428 after keeping employees aged 18–64 (every filter and its row count is in the notebook); 86% of them are in a job and state with at least 30 workers |
| **Features (8)** | age, education, usual hours per week, weeks worked, detailed occupation, occupation group, industry group, type of employer |
| **Target** | 1 = hourly wage above the median of the same occupation in the same state (medians from the training set only). 49% positive overall, but 45.5% of women vs 52.6% of men |
| **Audit only** | sex (main check), plus race/ethnicity, citizenship and age (short check): never given to the model, used to check its mistakes |
| **Limitations** | Self-reported wages and hours, so the hourly wage is an estimate; no information on employer, tenure, performance or union contracts; one year, US only |

## How it works

1. **Split first:** 20% of households become the test set, so housemates are never on both sides. Medians and the 30-worker rule use training data only.
2. **Pre-processing in a `Pipeline`:** numbers standardised (KNN and logistic regression need it), categories one-hot encoded.
3. **Baselines:** a dummy that always predicts the most common class, and the best single threshold on one feature.
4. **Tuning:** `GridSearchCV` with the same 5 folds and the same metric for all three models, on the same 20,000 training workers. The winner is then refitted on 200,000 workers.
5. **Test once** on 50,000 test workers, then check the mistakes per group and choose a strict signal threshold on held-out training households.

**Main metric: ROC-AUC**, because the tool needs a probability that ranks workers well. F1 was not usable: about half of all workers are above their median by definition, so "everyone is above" already scores F1 = 0.66.

## Results (test set, 50,000 workers)

| Model | Best hyperparameters | Train ROC-AUC | CV ROC-AUC (mean ± sd) | Test ROC-AUC | Precision | Recall | F1 |
|---|---|---|---|---|---|---|---|
| **Baseline:** most frequent class | – | 0.500 | 0.500 ± 0.000 | 0.500 | 0.000 | 0.000 | 0.000 |
| Single threshold on one feature | – | 0.585 | 0.583 ± 0.006 | 0.589 | 0.554 | 0.834 | 0.666 |
| KNN | k = 101 | 0.685 | 0.663 ± 0.003 | 0.664 | 0.600 | 0.676 | 0.636 |
| Logistic regression | C = 0.1 | 0.668 | 0.649 ± 0.006 | 0.649 | 0.611 | 0.592 | 0.601 |
| HistGradientBoosting | learning rate 0.05, 31 leaves | 0.760 | 0.689 ± 0.007 | 0.696 | 0.635 | 0.641 | 0.638 |
| **HistGradientBoosting, 200k rows (recommended)** | same | 0.735 | 0.716 (validation) | **0.717** | 0.648 | 0.668 | 0.658 |

All models except the last learned from the same 20,000 rows. Precision, recall and F1 are at the default threshold of 0.5.
HistGradientBoosting overfits on 20,000 rows (0.760 on its training data vs 0.696 on test). With 200,000 rows the gap shrinks to 0.02 and the test score rises. Logistic regression underfits: it has no gap, but scores low everywhere.

## Recommendation

**HistGradientBoosting, refitted on 200,000 workers, as a triage aid for advisers, with a strict signal threshold of 0.73.** It beats KNN by more than the spread over the folds and clearly beats both baselines. At the threshold, **1.6% of test workers get a signal**.

**Trade-off: explainability.** Logistic regression would be easier to explain: it gives one weight per feature (for example "older workers are more often above the median"). HistGradientBoosting combines hundreds of small decision trees, so it cannot say *why* a member got a high probability. We accept this because the model does not make the decision: an adviser does, and can explain a signal with two concrete numbers (the median wage for the member's job and state, and the member's own wage). The extra accuracy over logistic regression (0.717 vs 0.649 on test) means fewer unjustified signals and fewer missed workers.

## Ethical reflection

**Two mistakes, two costs.** An *unjustified signal* sends a member into a negotiation they cannot win: one of our strongest signals goes to a 60-year-old tax preparer with a master's degree, whose low pay may simply mean the degree is not needed for the job. A *missed signal* leaves an underpaid worker without help. We treat the first as worse, because a missed member can still come to the advice service themselves.

**Women and men.** Women get a signal more often than men (1.9% vs 1.4%): that is the pay gap the tool should reveal. But the model cannot tell discrimination apart from reasons it does not see, such as tenure or a smaller employer. It never sees sex, yet partly infers it from job and hours (ROC-AUC 0.81). We left sex out on purpose: as an input, the model would learn that lower pay for women is "normal" and flag it less often.

**A modest model.** With a test ROC-AUC of 0.717, it ranks two workers the right way round about 7 times in 10. So a signal is a reason to talk, never proof, and **no signal does not mean fairly paid**: only 1.6% of members get one. Hispanic and young workers get the fewest signals, so the tool may overlook them.

**What we did:**
* a signal only when at least 4 in 5 comparable workers earn more (threshold chosen on validation data);
* no prediction for jobs with fewer than 30 comparable workers in the state;
* checked the mistakes for women and men, plus a short check for other groups
* advisers should reach out to Hispanic and young members actively, and check the reported wage and hours before acting.

**Do not use it** to tell anyone they *are* underpaid, as evidence in a negotiation, by employers to set pay, or outside US employees. The data is public domain and anonymised, but the people in it were never asked about this use.

## How to run

* **Google Colab:** upload `fair_pay_checker.ipynb` and choose *Runtime → Run all*. No extra installs are needed. The first run downloads 575 MB from census.gov into `data/` (several minutes). The rest takes about 8 minutes on a 12-core laptop; on Colab's 2 CPUs expect roughly 20–30 minutes.
* **Locally:** Python 3.10+ with pandas, numpy, scikit-learn and matplotlib, then *Restart and Run All*. About 4 GB of free RAM is needed while loading.
* Last run end to end with **Python 3.13, pandas 2.3.3, numpy 2.3.5, scikit-learn 1.7.2, matplotlib 3.10.6**. All randomness uses `random_state=42`, so the numbers above are reproduced exactly.
