# Germix Data Dictionary

This document outlines the data schema and variables collected by the Germix game system. It is structured to be easily parsed by both humans and AI systems.

## 1. Authentication & Player Identification

| Variable Name | Type | Allowed Values | Notes |
| :--- | :--- | :--- | :--- |
| **`Student_ID`** | Numeric | Unique student ID (Faculty of Medicine Ramathibodi Hospital, Mahidol University) | One username is allowed per one student ID. |
| **`Username`** | Text | 1-10 characters | Used for game sign-in and leaderboard system. |
| **`Password`** | Text | 1-10 characters | Used for game sign-in system. |

## 2. Gameplay Metrics

| Variable Name | Type | Units | Allowed Values | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **`Gameplay_count`** | Numeric | Count | Integer ≥ 0 | Counted when the participant completes a full set of gameplays. |
| **`Gameplay_time`** | Numeric | Seconds | Integer ≥ 0 | Time spent per gameplay, displayed on the leaderboard. |
| **`Gameplay_score`** | Numeric | Points | Integer ≥ 0 | Calculated using accuracy and time spent per gameplay. |
| **`Total_score`** | Numeric | Points | Integer ≥ 0 | Cumulative score added every completed gameplay, displayed on the leaderboard. |

## 3. Academic Knowledge Assessments

All variables in this section share the following properties:
* **Type:** Numeric
* **Allowed Values:** 0-8
* **Units:** Points

### Midterm Period
* **`Midterm_Pre_Bact_score`**: General Knowledge Pre-Test (Section: Bacteria). *Recorded at enrollment.*
* **`Midterm_Pre_Fungi_score`**: General Knowledge Pre-Test (Section: Fungi). *Recorded at enrollment.*
* **`Midterm_Post_Bact_score`**: General Knowledge Post-Test (Section: Bacteria). *Recorded 1 week before midterm examination.*
* **`Midterm_Post_Fungi_score`**: General Knowledge Post-Test (Section: Fungi). *Recorded 1 week before midterm examination.*

### Final Period
* **`Final_Pre_Parasite_score`**: General Knowledge Pre-Test (Section: Parasite). *Recorded after midterm examination.*
* **`Final_Pre_Virus_score`**: General Knowledge Pre-Test (Section: Virus). *Recorded after midterm examination.*
* **`Final_Post_Parasite_score`**: General Knowledge Post-Test (Section: Parasite). *Recorded 1 week before final examination.*
* **`Final_Post_Virus_score`**: General Knowledge Post-Test (Section: Virus). *Recorded 1 week before final examination.*

## 4. Satisfaction Metrics

All variables in this section measure the student's feeling about specific exams and share the following properties:
* **Type:** Categorical
* **Allowed Values:** `1` (Very Dissatisfied), `2` (Dissatisfied), `3` (Neutral), `4` (Satisfied), `5` (Very Satisfied)
* **Notes:** Rated by participants.

### Midterm Period
* **`Midterm_Pre_Bact_satisfaction`**: Feeling about bacteria exam? (Pre-Test)
* **`Midterm_Pre_Fungi_satisfaction`**: Feeling about fungi exam? (Pre-Test)
* **`Midterm_Post_Bact_satisfaction`**: Feeling about bacteria exam? (Post-Test)
* **`Midterm_Post_Fungi_satisfaction`**: Feeling about fungi exam? (Post-Test)

### Final Period
* **`Final_Pre_Parasite_satisfaction`**: Feeling about parasite exam? (Pre-Test)
* **`Final_Pre_Virus_satisfaction`**: Feeling about virus exam? (Pre-Test)
* **`Final_Post_Parasite_satisfaction`**: Feeling about parasite exam? (Post-Test)
* **`Final_Post_Virus_satisfaction`**: Feeling about virus exam? (Post-Test)
