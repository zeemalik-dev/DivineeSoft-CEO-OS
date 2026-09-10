# DIVINEESOFT CEO OS — SCALE, FIX, AND ENHANCE THE EXISTING SYSTEM

You are a Senior AI Architect, Product Architect, UI/UX Designer, Full-Stack Engineer, Database Architect, and DevOps Engineer.

I already have an existing application called:

# DivineeSoft CEO OS

This is an AI-powered CEO Command Center and Company Workflow Management System.

## IMPORTANT INSTRUCTION

**Do not rebuild the existing application from scratch.**

First:

1. Analyze the existing codebase.
2. Understand the current architecture.
3. Identify existing features that already work.
4. Identify broken, incomplete, duplicated, or poorly designed features.
5. Preserve all working functionality.
6. Improve the existing architecture where necessary.
7. Scale the system incrementally.

Do not replace working features with mockups or simplified implementations.

Before making major architectural changes, explain:

- What currently exists.
- What is working.
- What needs fixing.
- What needs to be improved.
- What should be added.
- Whether database migrations are required.
- Whether existing data will be affected.

---

# EXISTING SYSTEM ARCHITECTURE

The current system is built around:

- Next.js App Router
- TypeScript
- PostgreSQL
- Prisma
- Anthropic Claude API
- Resend email integration
- Server-Sent Events for live activity
- Scheduled cron jobs
- Role-based access control
- Audit logging
- AI tool calling

The AI must NOT directly access the database.

The AI should interact with the application only through controlled backend tools.

Every important AI action must:

- Check permissions.
- Validate input.
- Be logged.
- Require confirmation when appropriate.

Preserve and improve this security model.

---

# COMPANY INFORMATION

Company Name:

DivineeSoft Technologies

Website:

www.divineesoft.com

The system should become the central internal operating system for managing the company.

---

# PRIMARY CEO

## Zeeshan Malik

Role:

CEO & Senior Technical Lead

Reports To:

None

Primary Responsibilities:

- Company strategy
- Technical leadership
- Project management
- Employee management
- Business growth
- Strategic planning
- Product decisions
- New ideas
- Problem solving

The CEO must have complete visibility into the company.

---

# ACTUAL EMPLOYEES

Use the following actual organizational structure.

## 1. Arslan Mustafa

Role:

Senior Full Stack Developer

Reports To:

Zeeshan Malik

Primary Responsibilities:

- Backend development
- Server deployment
- Technical architecture
- BarberzLink Admin Panel
- CosmoLink Admin Panel
- Managing and reviewing assigned web development work

---

## 2. Hassaan Mehboob

Role:

Junior Web Developer

Reports To:

Arslan Mustafa

Primary Responsibilities:

- BarberzLink Website
- CosmoLink Website
- DivineeSoft Website
- HRM Web Software

---

## 3. Falaq Bilal

Role:

Flutter App Developer

Reports To:

Zeeshan Malik

Primary Responsibilities:

- BarberzLink Mobile App
- BarberzLink Web App

---

## 4. Zainab Ehsaan

Role:

Flutter App Developer

Reports To:

Zeeshan Malik

Primary Responsibilities:

- CosmoLink Mobile App
- CosmoLink Web App

---

## 5. Zeeshan

Role:

HR & Employee Management

Reports To:

Zeeshan Malik

Primary Responsibilities:

- HR management
- Employee management
- Daily employee coordination
- Employee follow-ups
- Employee reporting

---

## 6. Zeeshan Malik

Role:

CEO & Senior Technical Lead

Reports To:

None

---

## 7. Adila Zahid

Role:

Business Developer

Reports To:

Zeeshan Malik

Primary Responsibilities:

- Upwork growth
- Upwork bidding
- Upwork profile optimization
- Business development
- Growth opportunities

---

# PROJECT STRUCTURE

The following projects must exist in the system.

## 1. BarberzLink Mobile App

Platforms:

- iOS
- Android

Assigned To:

Falaq Bilal

Reports To:

Zeeshan Malik

---

## 2. CosmoLink Mobile App

Platforms:

- iOS
- Android

Assigned To:

Zainab Ehsaan

Reports To:

Zeeshan Malik

---

## 3. BarberzLink Website

Assigned To:

Hassaan Mehboob

Managed By:

Arslan Mustafa

Final Reporting:

Zeeshan Malik

---

## 4. CosmoLink Website

Assigned To:

Hassaan Mehboob

Managed By:

Arslan Mustafa

Final Reporting:

Zeeshan Malik

---

## 5. BarberzLink Admin Panel

Assigned To:

Arslan Mustafa

Reports To:

Zeeshan Malik

---

## 6. CosmoLink Admin Panel

Assigned To:

Arslan Mustafa

Reports To:

Zeeshan Malik

---

## 7. BarberzLink Web App

Assigned To:

Falaq Bilal

Reports To:

Zeeshan Malik

---

## 8. CosmoLink Web App

Assigned To:

Zainab Ehsaan

Reports To:

Zeeshan Malik

---

## 9. BarberzLink Backend & Server Deployment

Assigned To:

Arslan Mustafa

Reports To:

Zeeshan Malik

---

## 10. CosmoLink Backend & Server Deployment

Assigned To:

Arslan Mustafa

Reports To:

Zeeshan Malik

---

## 11. DivineeSoft Website

Assigned To:

Hassaan Mehboob

Managed By:

Arslan Mustafa

Reports To:

Zeeshan Malik

---

## 12. HRM Web Software

Assigned To:

Hassaan Mehboob

Reports To:

Zeeshan Malik

---

## 13. Upwork Growth, Bidding & Optimization

Assigned To:

Adila Zahid

Reports To:

Zeeshan Malik

---

## 14. HR Management

Assigned To:

Zeeshan

Reports To:

Zeeshan Malik

---

# CORE OBJECTIVE OF THE SCALED SYSTEM

When the CEO opens the application, the CEO should immediately understand:

1. What is happening in the company.
2. Who is working on what.
3. Which employees require attention.
4. Which tasks are delayed.
5. Which projects are at risk.
6. What requires CEO approval.
7. What the CEO should focus on today.
8. What new ideas have been recorded.
9. What problems remain unresolved.
10. What opportunities or strategic actions should happen next.

The dashboard must provide useful information, not simply display large amounts of raw data.

---

# NEW CEO COMMAND CENTER

Redesign and improve the CEO dashboard.

The interface should feel:

- Premium
- Modern
- Executive-friendly
- Clean
- Professional
- Easy to scan
- Information-rich without being cluttered

Avoid:

- Too many colors
- Excessive cards
- Large empty spaces
- Overly technical developer interfaces
- Information overload

Use strong visual hierarchy.

---

# SECTION 1 — CEO DAILY BRIEFING

At the top of the dashboard display:

# Good Morning, Zeeshan

Then show a concise AI-generated executive briefing.

Example:

"Today, 6 employees have active work. Two tasks require attention, and one project is currently at risk. Your highest priority is reviewing the delayed BarberzLink Admin Panel work."

Display:

- Top priorities
- Critical risks
- Important deadlines
- Employees requiring attention
- Recommended next action

---

# SECTION 2 — COMPANY HEALTH

Display key company metrics:

- Total Employees
- Active Employees
- Employees With No Active Task
- Tasks In Progress
- Tasks Completed Today
- Overdue Tasks
- Blocked Tasks
- Projects At Risk

Each metric should link to the relevant filtered data.

Do not make metrics purely decorative.

---

# SECTION 3 — LIVE TEAM ACTIVITY

Create a highly useful employee activity section.

For every employee display:

- Employee name
- Role
- Current project
- Current active task
- Status
- Progress percentage
- Last activity
- Blocker status

Example:

Falaq Bilal

Flutter App Developer

Currently Working On:

BarberzLink Mobile App

Current Task:

Student Registration Module

Status:

In Progress

Progress:

70%

Last Activity:

25 minutes ago

Important:

"Currently Working On" must be calculated from:

- Active task status
- Latest task update
- Progress updates
- Daily updates

Do not falsely claim to track employees' physical computer activity.

---

# SECTION 4 — EMPLOYEE DETAIL PAGE

When the CEO clicks an employee, show a complete employee workspace.

Include:

## Overview

- Employee information
- Role
- Manager
- Current workload

## Current Work

- Active tasks
- Current project
- Progress

## Performance

- Tasks completed
- Overdue tasks
- Average completion time
- Daily updates submitted

## Recent Updates

- Latest work updates
- Comments
- Blockers

## Workload

Show:

- Current task count
- Upcoming deadlines
- Estimated workload

The CEO should be able to assign a task directly from this page.

---

# SECTION 5 — PROJECT COMMAND CENTER

Improve the project management experience.

Every project should have:

- Project name
- Project lead
- Manager
- Team members
- Overall progress
- Active tasks
- Completed tasks
- Overdue tasks
- Blockers
- Upcoming deadlines
- Recent activity

Project health:

- Healthy
- Needs Attention
- At Risk
- Blocked

The health calculation should be transparent and based on actual data.

For example:

A project should not be marked "Healthy" if multiple high-priority tasks are overdue.

---

# SECTION 6 — TASK MANAGEMENT

Improve task management.

Tasks must support:

- Title
- Description
- Project
- Assigned employee
- Created by
- Priority
- Status
- Progress
- Scheduled date
- Start date
- Due date
- Estimated duration
- Actual completion date
- Comments
- Attachments or relevant links
- Blockers
- Dependencies

Statuses:

- Not Started
- In Progress
- Waiting for Review
- Blocked
- Completed
- Overdue

Priorities:

- Critical
- High
- Medium
- Low

Create:

- List view
- Kanban board
- Employee view
- Project view
- Calendar view

Do not duplicate task logic between views.

All views must use the same task data source.

---

# SECTION 7 — SMART TASK ASSIGNMENT

Improve AI task assignment.

The AI should consider:

- Employee role
- Employee skills
- Existing workload
- Current projects
- Reporting hierarchy
- Existing deadlines
- Task priority

The AI should recommend the best employee.

Example:

"Arslan is currently overloaded with five high-priority backend tasks. Falaq and Zainab are not suitable for this backend task. Consider scheduling the task for later or assigning it to another qualified developer."

Do not allow AI to randomly invent development tasks.

New AI-generated tasks should normally be:

Suggested → Pending Approval → Approved → Assigned

The CEO can optionally enable direct automatic assignment for specific automation rules.

---

# SECTION 8 — DAILY EMPLOYEE UPDATES

Every employee should submit a daily update.

Create a clean and simple daily update interface.

Questions:

1. What did you work on today?
2. What did you complete?
3. What are you currently working on?
4. What blockers or problems do you have?
5. What will you work on next?
6. What help do you need?

The AI should summarize employee updates for the CEO.

Example:

# Daily Team Summary

Completed:

- 8 tasks completed.

In Progress:

- 12 active tasks.

Blockers:

- One technical blocker reported by Arslan.

Attention Required:

- Two employees have not submitted updates.

---

# SECTION 9 — CEO WORKSPACE

Create a powerful personal workspace for the CEO.

## My Tasks

Personal CEO tasks.

## My Schedule

- Meetings
- Reminders
- Deadlines
- Project reviews

## My Ideas

Capture and organize:

- Business ideas
- Product ideas
- Technical ideas
- Future projects

Each idea should support:

- Title
- Description
- Category
- Priority
- Created date
- Status

## Problem → Solution

Each problem should include:

- Problem
- Impact
- Category
- Severity
- Root cause
- Proposed solution
- Action plan
- Responsible person
- Status

Statuses:

- Open
- Investigating
- In Progress
- Resolved

---

# SECTION 10 — IDEA TO ACTION SYSTEM

This is a major new feature.

When the CEO enters a new idea, the AI should help transform it into action.

Example input:

"I want to build an AI platform that helps software companies manage remote employees."

The system should allow the CEO to:

1. Save as raw idea.
2. Analyze the idea.
3. Define the problem.
4. Define the target users.
5. Generate possible solutions.
6. Estimate technical complexity.
7. Create a research plan.
8. Convert the idea into a project.
9. Create milestones.
10. Suggest team members.

Important:

The AI must not automatically create a major project without CEO approval.

---

# SECTION 11 — PROBLEM TO SOLUTION SYSTEM

When a company problem is added:

The AI should help:

1. Define the problem clearly.
2. Identify potential root causes.
3. Suggest possible solutions.
4. Identify risks.
5. Recommend an action plan.
6. Suggest the responsible employee.
7. Create proposed tasks.

All AI-generated tasks must follow the approval workflow.

---

# SECTION 12 — WHAT SHOULD I DO NEXT?

Create a major feature called:

# CEO Next Action

The system should analyze:

- Overdue tasks
- Blocked tasks
- Project risks
- Upcoming deadlines
- CEO tasks
- Employee blockers
- Company goals
- New ideas
- Open problems

Then recommend:

## Critical Now

Immediate action required.

## Important Today

Tasks that should be completed today.

## Team Follow-Ups

People requiring CEO attention.

## Strategic Work

Long-term opportunities or decisions.

## Recommended Next Action

One specific high-value action.

Example:

"Review Arslan's blocker on the BarberzLink Backend deployment because it is affecting three dependent tasks."

---

# SECTION 13 — AI CEO ASSISTANT

Improve the existing Claude AI Assistant.

The assistant should understand the company's actual:

- Employees
- Roles
- Reporting structure
- Projects
- Tasks
- Daily updates
- Problems
- Ideas
- CEO tasks

Example commands:

"What is everyone doing right now?"

"What should I focus on today?"

"Show me Falaq's current workload."

"Which projects are at risk?"

"Why is the BarberzLink Admin Panel delayed?"

"Create a task for Hassaan."

"Schedule a review meeting for tomorrow."

"Turn my latest idea into a project plan."

"Analyze this company problem."

"Show me all employees who have not submitted today's update."

The AI must use live database information through controlled tools.

Never answer with outdated cached information when fresh information is available.

---

# SECTION 14 — EMAIL AUTOMATION

Improve existing email automation.

Daily employee email:

- Today's assigned tasks
- Overdue tasks
- Upcoming deadlines
- Important reminders

CEO Daily Briefing:

- Company health
- Employee activity
- Delayed tasks
- Blockers
- Project risks
- New ideas
- New problems
- CEO priorities
- Recommended next action

Add:

- Weekly employee summary
- Weekly CEO report
- Deadline reminders
- Blocker escalation
- Task review reminders

All emails should have:

- Professional HTML templates
- Responsive layout
- Clear calls to action

---

# SECTION 15 — AUTOMATION CENTER

Create a dedicated Automation Center.

Allow the CEO to:

- View automation rules.
- Enable or disable automations.
- Configure schedules.
- Configure escalation.
- Review automation history.
- View failed automation jobs.

Examples:

## Daily Task Briefing

Schedule:

Every weekday at 9:00 AM.

## Missing Daily Update Reminder

If an employee has not submitted an update by the configured deadline:

Send reminder.

## Blocker Escalation

When an employee reports a blocker:

Notify their manager.

If unresolved:

Escalate to CEO.

## Overdue Task

Notify employee first.

Escalate according to the reporting hierarchy if unresolved.

---

# SECTION 16 — REPORTING

Create:

## Daily Report

## Weekly Report

## Monthly Report

Reports should include:

- Employee performance
- Project progress
- Completed tasks
- Delayed tasks
- Blockers
- Workload
- Major achievements
- Risks

Reports should be useful for decision-making.

Do not simply display database records.

---

# UI/UX DESIGN REQUIREMENTS

The application must have a premium executive design.

Design principles:

- Clean layout
- Excellent spacing
- Consistent typography
- Strong information hierarchy
- Responsive design
- Dark mode support
- Light mode support
- Accessible components

Recommended layout:

LEFT SIDEBAR:

- Command Center
- My Tasks
- Projects
- Team
- Tasks
- Calendar
- Workspace
- Ideas
- Problems & Solutions
- Reports
- Automations
- AI Assistant
- Settings

TOP BAR:

- Global search
- Quick Add
- Notifications
- AI Assistant shortcut
- User profile

Add a Quick Capture feature.

The CEO should be able to type:

"Remind me to review CosmoLink tomorrow."

"New idea: AI freelancer management platform."

"Problem: Employee updates are often delayed."

The system should intelligently classify the input.

---

# DATA INTEGRITY REQUIREMENTS

Before changing existing database models:

1. Review the current schema.
2. Preserve existing data.
3. Use migrations.
4. Do not drop production tables unnecessarily.
5. Do not delete existing employee or project data.
6. Do not rename critical fields without a migration strategy.

---

# PERFORMANCE AND SCALABILITY

Improve the system for future growth.

The application should support:

- More employees
- More projects
- More tasks
- Multiple departments
- More AI conversations
- Additional managers
- Additional automation rules

Review:

- Database indexes
- Query performance
- Pagination
- API response sizes
- Real-time event volume
- AI request limits

Avoid unnecessary database queries.

---

# REQUIRED DEVELOPMENT PROCESS

Follow this exact process.

## STEP 1 — AUDIT

Analyze the existing system.

Create:

- Current feature inventory.
- Broken feature list.
- Missing feature list.
- Technical debt list.
- UI/UX issues.
- Security concerns.
- Scalability concerns.

Do not change the code yet.

---

## STEP 2 — IMPROVEMENT PLAN

Create a prioritized roadmap:

### Critical Fixes

Fix existing broken functionality.

### Core Improvements

Improve existing features.

### New Features

Add the requested scaling features.

### Future Features

Features that should be postponed.

---

## STEP 3 — UI/UX REDESIGN

Create the information architecture and page structure before implementing the new UI.

Ensure that all important CEO information can be understood quickly.

Do not redesign blindly.

Preserve useful existing components where possible.

---

## STEP 4 — DATABASE REVIEW

Review the existing Prisma schema.

Add only the necessary new models or fields.

Create safe migrations.

Add required indexes.

---

## STEP 5 — IMPLEMENTATION

Implement improvements incrementally.

After every major phase:

1. Run TypeScript validation.
2. Run tests.
3. Verify database migrations.
4. Verify authorization.
5. Verify AI tools.
6. Verify scheduled jobs.
7. Verify existing features still work.

Never introduce a large refactor without verifying existing functionality.

---

# FINAL PRODUCT VISION

The final application should feel like:

# An AI-Powered Operating System for the CEO of DivineeSoft Technologies.

When Zeeshan opens the system, he should immediately know:

- What every employee is doing.
- What each project needs.
- What tasks are delayed.
- Who needs attention.
- What problems exist.
- What ideas are worth exploring.
- What tasks he personally needs to complete.
- What the company should focus on.
- What his next most important action should be.

The AI Assistant should act as an intelligent Chief of Staff.

However:

- AI does not directly access the database.
- AI actions are controlled through secure tools.
- Important actions require approval.
- Every AI action is logged.
- Existing working functionality must be preserved.

Start by auditing the existing codebase.

Do not start rewriting the application immediately.

First provide a detailed audit and implementation roadmap based on the actual existing code.