# Term 1 - Week 1: Python Basics & Flow Control

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

# LearnBridge

**AI for Good - Hackathon 1**  
**Students:** Arbër & Sofiia  
**Required AI tool:** Bolt.new  
**SDG:** SDG 4 - Quality Education  
**Live prototype:** https://learnbridge-auth-and-lvi6.bolt.host
**Video of the prototype:** https://youtu.be/E1BimdNg5cQ

> **Learning should not stop when the internet does.**

---

## Required Hackathon Information

**Project title:** LearnBridge

**My pair partner:** Sofiia

**Tool we had to use:** Bolt.new

**SDG we had to address:** SDG 4 - Quality Education

**What problem does it solve, and for whom?**  
LearnBridge is designed for secondary-school students who have access to a phone, tablet, or computer but cannot rely on a continuous internet connection. A student may only have Wi-Fi or mobile data for a short period, which makes continuous streaming and always-online learning platforms difficult to use. LearnBridge lets teachers organize learning material by class and lesson so students can use a short period online to find and download what they need, then open the downloaded files later without internet.

**What did we build?**  
We built a working web application with separate Teacher and Student roles. Teachers can create classes, add students, create lessons for specific classes, publish homework, review submissions, and give grades and feedback. Students only see lessons for classes they belong to, can download lesson materials to their device for offline use, submit homework, edit submissions, and view teacher feedback and grades.

**Link to the live thing:**  
https://learnbridge-auth-and-lvi6.bolt.host

**How do I run it?**  
The easiest way is to open the deployed URL above. To run the code locally, open the project folder, install the Node.js dependencies, and start the Vite development server.

The local application also needs the Supabase configuration used by the project for authentication, database access, and file storage.

**Who did what?**  
Arbër built most of the website using Bolt.new and created the first versions of the README and presentation. Sofiia contributed edits to the website, developed the original concept and feature ideas, reviewed and tested the application, and improved the presentation and README. Both team members discussed the product and refined the final result.

**Ethical reflection: what are the risks and who could it harm?**  
LearnBridge is meant to reduce a connectivity barrier, but it can still exclude students who have no device, electricity, storage space, digital skills, or any internet access at all. Because the platform can contain student names, emails, submissions, grades, and teacher feedback, weak access control could expose sensitive educational information, especially when minors or shared devices are involved. Large videos and files could also consume scarce mobile data or storage, and incorrect or inappropriate teacher content could harm students. The prototype reduces some of these risks through authenticated Student/Teacher roles, class-based lesson access, and database access controls. A production version would also need stronger privacy governance, teacher verification, moderation/reporting, data minimization, clear file sizes, lightweight content options, and alternatives for students who cannot use a digital platform.

---

# 1. Problem Definition

Many digital learning systems assume that the student can remain connected while learning. That assumption does not fit every student.

Our problem is specifically about a **secondary-school student who owns or can access a digital device, but only has reliable internet occasionally**. Their connection may be unstable, expensive, limited by mobile data, or temporarily unavailable because of remote geography, damaged infrastructure, displacement, disaster, conflict, or another disruption.

A typical online platform may expect the student to stream a video, keep a lesson page open, download separate attachments, check messages, and submit homework while connected. If the student's useful online time is short, this creates a practical barrier to learning.

### Evidence that connectivity is a significant education problem

A joint **UNICEF and International Telecommunication Union (ITU)** report published in 2020 estimated that **1.3 billion school-age children aged 3–17 did not have an internet connection at home**, equal to about two thirds of school-age children worldwide at that time.

Source: UNICEF & ITU, *How many children and young people have internet access at home?*  
https://www.unicef.org/reports/how-many-children-and-young-people-have-internet-access-home-2020

This statistic does **not** mean that all of those children match our exact target user or have intermittent internet. It is evidence that internet connectivity is a major barrier to digital education and helps explain why learning systems should not always assume continuous connectivity.

### Concrete example

Consider a student who gets reliable Wi-Fi for a short period every few days. During that period, the student needs to find the correct lesson, video, worksheet, homework instructions, and deadline. If these are spread across email messages or require constant access to an online platform, valuable connection time is lost.

LearnBridge is designed around the opposite assumption:

**Connect → find the correct class content → download → learn from the files offline → reconnect when needed.**

---

# 2. Intended Users

## Primary user

Our primary user is:

> A secondary-school student who has access to a phone, tablet, or computer but cannot depend on continuous internet access.

Relevant conditions include:

- internet is unstable, limited, expensive, or only occasionally available;
- the student may have limited mobile data;
- online time may need to be used efficiently;
- the student may use a low-end or shared device;
- school attendance or normal learning access may be disrupted;
- lesson material needs to remain clearly organized by class and lesson.

Possible contexts include remote areas, disaster-affected regions, displacement situations, conflict-affected areas, or other places where reliable connectivity cannot be assumed.

## Secondary user

Teachers are the second user group. They need a way to organize lessons, homework, files, submissions, grades, and feedback for the correct students instead of publishing everything to everyone.

## Who is not the intended user?

LearnBridge does not solve every education-access problem.

It is **not** designed as the main solution for:

- students who have no digital device at all;
- students who have no electricity to charge a device;
- students who never have any internet access to receive new material;
- users whose existing school platform already works well with reliable connectivity and already provides the same workflow.

These exclusions matter because some of the students most affected by educational inequality may also lack the minimum technology needed to use LearnBridge.

---

# 3. The Solution

LearnBridge is a class-based learning platform built around short periods of connectivity.

The core workflow is:

> **Teacher organizes learning → student connects → student downloads materials → student learns from those files offline → student reconnects to submit work or receive updates.**

## Teacher flow

A teacher can:

1. create or log into a Teacher account;
2. create a class;
3. manage students in that class, including manually adding students and using the class invite-code workflow;
4. create a lesson with title, subject, level, language, duration, description, learning objectives, notes, and optional video/material;
5. assign the lesson to one or more of the teacher's classes while creating it, or assign an existing lesson later;
6. create homework connected to a lesson, including instructions, an optional due date, and optional files;
7. view student submissions;
8. open or download submitted files;
9. give a grade and written feedback.

## Student flow

A student can:

1. create or log into a Student account;
2. access their classes;
3. see lessons that have been assigned to classes they are enrolled in;
4. open a lesson and view its description, objectives, notes, video, and homework;
5. download teacher-provided files such as videos, PDFs, documents, homework attachments, and generated lesson notes to the device;
6. open those downloaded files later using the device's normal file system, even when the internet is unavailable;
7. submit homework with an answer and/or file;
8. edit a submission when needed;
9. view the teacher's grade and feedback.

## Class-based access

Lessons are not intended to be visible to every student.

A teacher assigns each lesson to the relevant class or classes. Students only receive access to lessons for classes in which they are enrolled. The application uses authenticated accounts and database access rules, rather than relying only on hidden buttons in the interface.

This makes the structure:

**Teacher → Class → Lesson → Homework → Submission → Grade & Feedback**

---

# 4. Input → Process → Output

## Teacher

### Input

The teacher provides:

- class information;
- lesson title and subject;
- level, language, and duration;
- lesson description;
- learning objectives and notes;
- optional lesson video or file;
- the class or classes that should receive the lesson;
- homework instructions, due date, and optional attachments;
- later, a grade and feedback for a student's submission.

### Process

LearnBridge:

1. authenticates the teacher;
2. stores the lesson and files using the application's database/storage layer;
3. links the lesson to the selected class or classes;
4. limits student access according to class membership;
5. connects homework to the relevant lesson;
6. stores student submissions and uploaded files;
7. connects teacher grades and feedback to the relevant submission.

### Output

The correct students can see the published lesson and homework. The teacher can later see their submissions and provide feedback and grades.

## Student

### Input

The student logs in, opens an assigned lesson, chooses materials to download, and can later submit an answer or file for homework.

### Process

LearnBridge:

1. checks the student's authenticated access;
2. retrieves lessons assigned to the student's classes;
3. provides the lesson and downloadable materials;
4. lets the browser save selected files to the student's actual device storage;
5. stores submitted homework online when the student reconnects and submits it;
6. retrieves any grade and feedback added by the teacher.

### Output

The student receives organized learning material for the correct class, can use downloaded files without remaining connected to LearnBridge, and can later submit work and receive teacher feedback.

---

# 5. Offline / Limited-Connectivity Design

The current prototype does **not** claim that the entire web application works offline.

Instead, LearnBridge makes important learning materials downloadable to the student's **actual device storage**. Depending on the device and browser, these files are normally available through locations such as Downloads or Files.

Examples include:

- lesson videos uploaded by the teacher;
- PDFs;
- documents;
- images and worksheets;
- homework attachments;
- downloadable lesson notes.

This means a student can connect briefly, download the required files, disconnect, and continue learning from those files without keeping the website open.

External video links still require internet access because LearnBridge does not automatically download third-party hosted videos.

The **My Downloads** page was intentionally removed because the browser cannot reliably know whether a user still has a file in the device's Downloads folder. The actual download buttons inside lessons remain available.

---

# 6. Why Not Just Use Email or a Shared Folder?

Email and cloud folders can transfer files, but they do not provide the same learning workflow.

After several weeks, a student could have different emails or files for:

- lesson videos;
- worksheets;
- homework instructions;
- revised files;
- deadlines;
- submitted work;
- teacher feedback.

LearnBridge keeps these elements connected to the correct **class, lesson, homework task, student submission, and teacher feedback**.

For a student with little online time, this matters because the student should not spend that time searching through unrelated messages and different versions of files.

> **Email transfers files. LearnBridge organizes the learning process around unreliable connectivity.**

A normal shared folder also does not automatically provide Student/Teacher roles, class membership, assignment submission, grading, and feedback in the same structured flow.

---

# 7. Connection to SDG 4 - Quality Education

LearnBridge addresses **United Nations Sustainable Development Goal 4: Quality Education**.

The concrete SDG 4 issue in our project is unequal access to digital learning when continuous internet access cannot be assumed.

The prototype responds by:

- organizing learning material by class and lesson;
- restricting lessons to the relevant students;
- allowing important materials to be downloaded during periods of connectivity;
- allowing students to submit work and receive feedback when connected again;
- giving teachers a structured way to continue the learning process.

If the approach works in practice, it can help students maintain access to organized educational material despite unreliable connectivity. It does not solve all barriers to education, but it targets one specific barrier.

---

# 8. Use of the Required AI Tool - Bolt.new

**Bolt.new was the AI tool assigned for this hackathon.** We used it meaningfully throughout development of the prototype.

We did not only mention Bolt.new in the presentation. We used the AI app-building environment to generate and iteratively modify the actual application implementation from our requirements and feedback.

The workflow was approximately:

1. define the problem and intended users;
2. decide the Student and Teacher flows and required features;
3. describe those requirements to Bolt.new in prompts;
4. let Bolt.new generate or modify the React/TypeScript application and Supabase-related implementation;
5. test the generated result;
6. identify incorrect or missing behaviour;
7. give Bolt.new focused follow-up prompts;
8. repeat until the prototype matched the intended workflow.

Bolt.new was used during work on areas such as:

- the Student and Teacher interfaces;
- authentication and role-specific screens;
- classes and class membership;
- lesson creation and class assignment;
- homework;
- student submissions;
- grades and feedback;
- Supabase database/storage integration;
- access-control/RLS fixes;
- file-download behaviour;
- bug fixing and refinement.

The repository also contains Bolt project/prompt evidence in the project files. This demonstrates that the required AI tool was part of the actual implementation process, not added only as a label after development.

---

# 9. Working Prototype — End-to-End Demo

The prototype can be demonstrated as one connected workflow.

## Teacher side

**Teacher login → create/manage class → add students → create lesson → assign lesson to class → create homework**

Expected result:

- the lesson is stored;
- it is connected to the selected class;
- only enrolled students can access it;
- homework and files are attached to the relevant lesson.

## Student side

**Student login → open class lesson → view lesson → download materials → submit homework**

Expected result:

- the student can see the lesson assigned to their class;
- the student can download lesson materials to the device;
- the student can submit an answer/file;
- the submission can be edited when necessary.

## Teacher feedback

**Teacher opens submissions → views/downloads student's work → adds grade and feedback**

Expected result:

- the grade and feedback are stored for that student's submission.

## Student result

**Student opens grades/feedback**

Expected result:

- the student sees the teacher's grade and written feedback.

## Limited-connectivity demonstration

**While online:** student opens lesson → downloads an MP4/PDF/document/notes file.  
**Then offline:** student opens the saved file from the device's Downloads/Files location.

This demonstrates the intended limited-connectivity value without claiming that every part of the website itself remains available offline.

---

# 10. Ethical Reasoning

The ethical risks are directly connected to the people and data in LearnBridge.

| Risk | Possible consequence | Current or future mitigation |
|---|---|---|
| **Digital exclusion** | Students without a device, electricity, storage, digital skills, or any connectivity cannot benefit and may be further disadvantaged. | Keep content lightweight, support low-end devices and multiple languages, show file sizes, and provide non-digital alternatives in a real deployment. |
| **Privacy of students/minors** | Names, email addresses, submissions, grades, or feedback could be exposed to unauthorized users. | Use authenticated roles, class-based access and database access controls. A production version should add stronger data minimization, auditing, account recovery, and child-appropriate privacy policies. |
| **Shared devices** | Another person using the same device could see downloaded learning material or an active student session. | Allow logout, avoid storing unnecessary personal information in downloaded files, and give users clear guidance for removing local files on shared devices. |
| **Incorrect or harmful educational content** | A teacher could upload incorrect, biased, inappropriate, or copyrighted material. | A production system should verify teachers, provide reporting/moderation processes, and define publishing rules. |
| **Data and storage cost** | Large videos or files could consume a student's limited mobile data or fill device storage. | Prefer compressed/lightweight resources, make downloads optional, show file sizes where possible, and offer text/document alternatives to large media. |
| **Access-control mistakes** | A lesson, submission, or grade could be shown to the wrong user or class. | Use authenticated roles and database/RLS rules, and test class membership and permissions instead of relying only on frontend visibility. |

These mitigations do not remove every risk. A real deployment involving minors and educational records would require stronger security, privacy, moderation, and governance than a hackathon prototype.

---

# 11. Limitations

LearnBridge currently has important limitations:

- the website still requires connectivity to receive new lessons, submit work, or retrieve new feedback;
- the entire application is not guaranteed to work offline;
- only files that the student actually downloads are available from the device offline;
- external video URLs remain online resources;
- students without a device, electricity, or any connection remain excluded;
- file downloads can consume storage and mobile data;
- browser behaviour can differ between Windows, Android, iOS, and other platforms;
- a production deployment would require stronger privacy, moderation, teacher verification, monitoring, and operational security.

These limitations are important because we do not want to claim that the prototype solves every cause of educational inequality.

---

# 12. Built With

- **Bolt.new** — required AI app-building tool
- React
- TypeScript
- Vite
- Tailwind CSS
- Supabase / Bolt Database
- Supabase Authentication
- Supabase Storage
- Supabase Row Level Security (RLS)

---

# 13. Team Contribution

## Arbër

- built most of the website using Bolt.new;
- worked on implementing and fixing the application features;
- created the first version of the README;
- created the first version of the presentation.

## Sofiia

- developed the original LearnBridge concept and feature ideas;
- contributed edits to the website;
- reviewed and tested the product;
- improved the presentation;
- improved the README.

## Shared work

- discussed the product direction;
- reviewed the prototype and its features;
- refined the final result based on testing and feedback.


---

# 14. Submission Checklist

- [x] Prototype code/export is in `hackathon/`
- [x] This week's slides are in `hackathon/` — **confirm this before final submission**
- [x] The prototype runs through the deployed URL
- [x] Instructions for running the project are documented
- [x] Ethical reflection is included
- [x] Required AI tool and SDG are documented
- [x] Problem, intended users, excluded users, and evidence are documented
- [x] End-to-end prototype flow is documented

---

## Core Takeaway

> **LearnBridge is not just a place to upload files. It organizes classes, lessons, homework, submissions, grades, and feedback around students who cannot rely on being connected all the time.**


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
The most important thing i learned this week was in overall clear understanding about pros of AI and how it can be implemented to daily life and innovationts 

**Where does this connect to "AI for Good"?**
The connection is how everyday AI innovations can democratize access to education and professional skills, though it requires ethical implementation to ensure the algorithms don't perpetuate existing biases.
