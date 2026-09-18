# Term 1 - Week 2: Loops & Functions

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

**Project title:** Hio 

**My pair partner:** Sofiia, Lucas, Majed

**Tool we had to use:** N8N 

**SDG we had to address:**  SDG 3 — Good Health & Well-being

**What problem does it solve, and for whom?**
When people are overwhelmed, planning is the first thing they stop doing, which is exactly when they need it most. Most wellbeing apps then ask for more effort: another app, another form, another daily check. Hio does the opposite. It lives in Telegram, takes text, voice notes or a shared location in any language, and does the work itself instead of handing the user a to do list.
This is not a small group. In the national student monitor by RIVM and Trimbos, 44% of students reported anxiety or depression symptoms (2023), and in 2025 a third of the students who had complaints received no advice or help at all.
Hio is not for people in crisis, not for children, and not a replacement for therapy. It is everyday support, with a clear exit to humans.

**What did you build?**
 A Telegram bot with a brain behind it. Hio:
●	Talks like a friend, remembers the conversation, and replies in the user's own language.
●	Plans by reading their Google Calendar, adding study blocks, breaks and deadlines, and keeping tasks in two Google Tasks lists.
●	Journals with them: one quote, one everyday example, one question. By text, or all in one message so they can answer with a single voice note.
●	Checks in on its own, in the morning, at their chosen hour, and after a few days of silence. Never nagging.
●	Knows where they are. If they share their location, Hio saves it and uses it for weather, real nearby places from OpenStreetMap, and a maps link to get there.
●	Searches the web with Tavily for things it cannot know, like opening hours or what is on this weekend. Never for anything medical.
●	Sends a weekly board every Sunday: which habits they kept, what they wrote, and the week ahead with the weather and their schedule.
●	Watches for crisis before anything else runs. If it sees risk, it stops helping and points to 113 Zelfmoordpreventie.
Voice notes are transcribed with Whisper, so the whole thing works by speaking.


**Link to the live thing (if any):**
_Deployed URL, workflow export, video demo - whatever proves it works._

**How do I run it?**
1.	Import hio-workflow.json into your n8n instance and set the timezone to Europe/Amsterdam.
2.	Connect the accounts in the credential nodes: Telegram (your own bot from @BotFather), Anthropic, OpenAI, Tavily, Google Calendar, Google Tasks and Google Sheets.
3.	Make a Google Sheet called Hio DB with these tabs: Users, Journal, Quotes, Habits, Habit Log. Import hio_quotes.csv into the Quotes tab.
4.	Make two Google Tasks lists and put their IDs in the task nodes.
5.	Point the Sheets, Calendar and Tasks nodes at your own documents.
6.	Turn the workflow on, open the bot in Telegram, and send it a message. It sets you up in conversation


**Who did what?**
Lucas developed the technical N8N workflow and integrations. Sofiia handled the conceptualization, project descriptions, and setup workflows, while Majed was doing  presentation design and testing. 

**Ethical reflection - what are the risks of your tool? Who could it harm?**
Privacy. Hio holds what someone wrote at 3am, plus their calendar, their habits, their city and sometimes their exact location. That is more revealing than a medical file, because it covers what they did and how they felt about it. Right now it sits in a Google Sheet on a personal account, and every conversation is stored in the n8n log in plain text. Fine for a school prototype, not acceptable for a real user.
Dependency. We deliberately made Hio warm, funny and awake at any hour. For someone isolated, that is exactly the risk. It can quietly become the easiest relationship in their life, and easier than people is not the same as better than people. Hio is told to be glad when they are busy with real friends, but a prompt is a weak guardrail for something this comfortable.
Being wrong with confidence. While building this, Hio told me a task was ticked off. It was not, and it said so twice without hesitating. Harmless here. Scale that from a task to “you seem better this week” and nobody is accountable: not us, not the AI companies whose terms exclude it, and not the user, who was told it would help.
Where automation stops. Every message is classified before anything else runs, tuned to over-trigger, because a false alarm costs far less than a missed one. When it fires, Hio stops being useful, says plainly that it is an AI and cannot give what is needed, and points to 113 Zelfmoordpreventie (113 or 0800-0113, free, 24/7) or 112 in immediate danger. It does not coach or assess. Those numbers are written into the workflow, not generated by the AI, so they still go out even if the AI part fails completely.
Would I trust it for my own health? For planning and journaling, yes. For a crisis, no, and nobody should. That is the honest description: a companion for ordinary days, with a clear exit to humans for the days that are not.


### Checklist
- [ ] Prototype code (or export / workflow file) is in `hackathon/`
- [ ] This week's slides are in `hackathon/`
- [x] The prototype actually runs, and I wrote down how to run it
- [x] Ethical reflection written above

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
