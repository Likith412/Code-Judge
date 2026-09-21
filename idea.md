An Online Code Judge is basically a mini version of platforms like LeetCode, HackerRank, or CodeChef where users can write and submit programming solutions, and your system automatically checks whether their code is correct.

🧩 How it works

Suppose your platform has a problem:

Two Sum
Given an array and a target, find two numbers whose sum equals the target.

The user writes:

int[] twoSum(int[] nums, int target) {
...
}

Then clicks Submit.

Your backend:

User
↓
Writes code
↓
POST /submissions
↓
Backend
↓
Queue
↓
Code Execution Service
↓
Compile & Run
↓
Test Cases
↓
Compare output
↓
Verdict

The user might see:

✓ Accepted
Runtime: 42 ms
Memory: 38 MB

Or:

✗ Wrong Answer

⸻

🔥 Why it’s a strong resume project

It’s much more than CRUD.

You get to work with:

- Java / Spring Boot → backend APIs
- React → coding interface
- PostgreSQL → users, problems, submissions
- Docker → safely execute user code
- Redis / RabbitMQ / Kafka → submission queue
- Multithreading & concurrency
- Authentication & authorization
- Time and memory limits
- System design
- Security
- DSA

The interesting part is the code execution engine.

For example:

                ┌───────────────┐
                │    React UI   │
                └───────┬───────┘
                        │
                        ▼
                ┌───────────────┐
                │ Spring Boot   │
                │    Backend    │
                └───────┬───────┘
                        │
                        ▼
                ┌───────────────┐
                │ Submission    │
                │    Queue      │
                └───────┬───────┘
                        │
                        ▼
              ┌───────────────────┐
              │ Execution Service │
              └─────────┬─────────┘
                        │
                        ▼
                 ┌────────────┐
                 │   Docker   │
                 │  Sandbox   │
                 └─────┬──────┘
                       │
                 Run user's code
                       │
                       ▼
                ┌──────────────┐
                │ Test Cases   │
                └──────┬───────┘
                       ▼
                 Final Verdict

🛡️ Why Docker?

This is one of the coolest parts of the project.

You cannot simply run arbitrary code directly on your server.

A malicious submission could potentially do something like:

while (true) {
// consume CPU forever
}

or try to access files/network resources.

So you execute submissions inside an isolated Docker container with restrictions such as:

CPU limit
Memory limit
Execution timeout
No/limited network access
Restricted filesystem

Then destroy the container after execution.

📈 You can build it in stages

Level 1 — Basic

- Login/signup
- Problem list
- Code editor
- Submit Java code
- Run against test cases
- Accepted / Wrong Answer

Level 2 — Good resume project

- Multiple languages
- Docker sandbox
- Time/memory limits
- Submission history
- Difficulty levels
- User profiles
- Leaderboard

Level 3 — Excellent

- Redis submission queue
- Multiple execution workers
- Horizontal scaling
- Rate limiting
- Hidden test cases
- Contest mode
- Real-time submission status
- Monitoring/logging
- Admin problem management

If you’re aiming for Java/Spring Boot SDE roles, this is one of the projects I’d strongly recommend because you can discuss both coding and real backend/system-design concepts in an interview.

Yes. You can build an Online Code Judge from scratch, and I’d recommend building it incrementally rather than trying to recreate LeetCode immediately.

Since you’re working with Java, a very good stack would be:

React + Spring Boot + PostgreSQL + Redis + Docker

1. Overall architecture

                USER
                 │
                 ▼
          ┌──────────────┐
          │    React     │
          │ Code Editor  │
          └──────┬───────┘
                 │
                 │ Submit code
                 ▼
          ┌──────────────┐
          │ Spring Boot  │
          │   Backend    │
          └──────┬───────┘
                 │
                 │ Create submission
                 ▼
          ┌──────────────┐
          │    Redis     │
          │    Queue     │
          └──────┬───────┘
                 │
                 ▼

   ┌─────────────────────┐
   │ Execution Worker │
   │ (Java) │
   └──────────┬──────────┘
   │
   ▼
   ┌──────────────┐
   │ Docker │
   │ Sandbox │
   └──────┬───────┘
   │
   Compile + Execute
   │
   ▼
   ┌──────────────┐
   │ Test Cases │
   └──────┬───────┘
   │
   ▼
   ┌──────────────┐
   │ Verdict │
   │ AC / WA / TLE│
   └──────────────┘

⸻

2. Start with the simplest version

Don’t start with Redis, Docker, multiple languages, etc.

First make this work:

React
↓
Spring Boot
↓
Java Compiler
↓
Run program
↓
Compare output

For example, your database has:

## Problem

id: 1
title: Two Sum
description: ...
input: ...
output: ...

and test cases:

## TestCase

problem_id: 1
input: "2 7 11 15\n9"
expected: "0 1"

⸻

3. Create the backend

Spring Boot can expose:

GET /api/problems

Get all problems.

GET /api/problems/1

Get a particular problem.

And:

POST /api/submissions

The request could look like:

{
"problemId": 1,
"language": "java",
"code": "..."
}

The backend creates:

## Submission

id
user_id
problem_id
language
code
status
runtime
memory
created_at

Initially:

status = QUEUED

⸻

4. The interesting part: executing the code

Suppose the user submits:

public class Main {
public static void main(String[] args) {
System.out.println(5 + 5);
}
}

Your execution service needs to:

Step 1 — Create a temporary directory

/submissions/123/
Main.java
input.txt

Step 2 — Save the user’s code

Main.java

Step 3 — Compile

Conceptually:

javac Main.java

If compilation fails:

COMPILATION_ERROR

Otherwise continue.

Step 4 — Run

Give the program the test input:

input.txt

and capture:

stdout
stderr

Step 5 — Compare output

Expected:

10

Actual:

10

Therefore:

ACCEPTED

⸻

5. Why Docker comes in

This is where the project becomes much more interesting.

You shouldn’t execute arbitrary user code directly on your Spring Boot server.

Instead:

Spring Boot
│
▼
Docker container
│
├── User code
├── Input
└── Runtime

The container can have restrictions such as:

CPU limit
Memory limit
Execution timeout
Restricted filesystem
No network

For example:

Submission #123
│
▼
┌─────────────────────┐
│ Docker Container │
│ │
│ Main.java │
│ input.txt │
│ │
│ javac Main.java │
│ java Main │
└─────────────────────┘
│
▼
Output

After execution, remove the container.

Important: container isolation is not automatically a perfect security boundary. For a portfolio project, you should explicitly document the sandbox’s limitations rather than claim it is production-grade arbitrary-code isolation.

⸻

6. Then add a queue

Imagine 100 users submit simultaneously.

You don’t want your API server doing:

Compile
Run
Compile
Run
Compile
Run
...

Instead:

              Spring Boot
                   │
                   ▼
              Redis Queue
          ┌────┬────┬────┐
          │ S1 │ S2 │ S3 │
          └────┴────┴────┘
             │
             ▼
      ┌───────────────┐
      │ Worker 1      │
      │ Worker 2      │
      │ Worker 3      │
      └───────────────┘

Each worker takes a submission:

QUEUED
↓
RUNNING
↓
ACCEPTED

or:

QUEUED
↓
RUNNING
↓
WRONG_ANSWER

This introduces asynchronous processing and concurrency, which is excellent interview material.

⸻

7. Database design

You could start with these tables:

Users

## users

id
username
email
password
created_at

Problems

## problems

id
title
description
difficulty
created_at

Test cases

## test_cases

id
problem_id
input
expected_output
is_hidden

Submissions

## submissions

id
user_id
problem_id
language
code
status
runtime
memory
created_at

Eventually:

users
│
└──── submissions
│
└──── problems
│
└──── test_cases

⸻

8. Frontend

Your React page could look like:

┌─────────────────────────────────────────────┐
│ Problem: Two Sum │
├───────────────────┬─────────────────────────┤
│ │ │
│ Given an array... │ Code Editor │
│ │ │
│ Example: │ public class Main { │
│ Input: ... │ ... │
│ Output: ... │ } │
│ │ │
│ │ [ Run ] [ Submit ] │
├───────────────────┴─────────────────────────┤
│ Submission │
│ ✓ Accepted │
│ Runtime: 42 ms │
│ Memory: 32 MB │
└─────────────────────────────────────────────┘

For the editor, you can use Monaco Editor, the editor technology behind VS Code.

⸻

9. Then support multiple languages

Once Java works:

language = java
↓
Java Executor

Add:

language = python
↓
Python Executor

Then:

language = cpp
↓
C++ Executor

Your architecture becomes:

              Submission
                   │
             ┌─────┴─────┐
             │  Language  │
             └─────┬─────┘
                   │
        ┌──────────┼──────────┐
        ▼          ▼          ▼
      Java       Python      C++
        │          │          │
        ▼          ▼          ▼
     Docker      Docker     Docker

⸻

10. Add verdicts

Your judge should distinguish:

ACCEPTED
WRONG_ANSWER
TIME_LIMIT_EXCEEDED
MEMORY_LIMIT_EXCEEDED
COMPILATION_ERROR
RUNTIME_ERROR

For example:

Test case 1 → ✓
Test case 2 → ✓
Test case 3 → ✗
Final result:
WRONG ANSWER

⸻

11. A good development roadmap

I’d build it in this order:

Phase 1 — Basic

Spring Boot
↓
Java compilation
↓
Java execution
↓
Output comparison

Phase 2 — Website

React
├── Login
├── Problems
├── Problem page
├── Code editor
└── Submission results

Phase 3 — Database

PostgreSQL
├── Users
├── Problems
├── Test cases
└── Submissions

Phase 4 — Security

Docker
├── CPU limits
├── Memory limits
├── Timeout
└── Network restrictions

Phase 5 — Scalability

Spring Boot
↓
Redis Queue
↓
Execution Workers
↓
Docker containers

Phase 6 — Advanced

Add:

- Multiple languages
- Leaderboards
- Contests
- Problem difficulty
- User profiles
- Submission history
- Admin dashboard
- Real-time submission status
- Rate limiting
- Logging/monitoring

⸻

🎯 What I’d recommend for your resume

Don’t try to build the entire thing at once.

Build Java-only first, get the complete pipeline working:

React
↓
Spring Boot
↓
PostgreSQL
↓
Redis
↓
Worker
↓
Docker
↓
Java execution
↓
Test cases
↓
Verdict

That alone is already a very strong project.

Then add Python/C++ and contests if you have time.

If you want, I can take you through this from absolute zero, starting with Step 1: creating the Spring Boot project and designing the database, and then we can build the whole Online Judge step-by-step.

Yes — you can absolutely build the Online Code Judge using MERN. In fact, it’s a good choice if you’re targeting full-stack JavaScript roles.

MERN version

React
↓
Node.js + Express
↓
MongoDB
↓
Redis Queue
↓
Code Execution Worker
↓
Docker
↓
JavaScript / Python / C++ execution

What each part does

Technology Role
React Problem page + code editor + submissions
Node.js Backend/server
Express REST APIs
MongoDB Users, problems, submissions, test cases
Redis Submission queue
Docker Safely isolate submitted code
Worker Compile/run code and judge it

Example flow

User clicks Submit:

React
│
│ POST /api/submissions
▼
Express
│
│ Save submission
▼
MongoDB
│
│ Add job
▼
Redis
│
▼
Worker
│
▼
Docker Container
│
├── Compile
├── Run
├── Apply test cases
└── Capture output
│
▼
Compare output
│
▼
MongoDB
│
▼
React
│
▼
✓ Accepted

One important point

MERN itself doesn’t provide the code execution part.

MERN handles your application:

React + Node + Express + MongoDB

You still need something like Docker + a worker service to execute arbitrary submitted programs in isolation.

And that’s actually what makes this project impressive.

Recommended stack

I’d build your version with:

Frontend
├── React
├── Tailwind CSS
└── Monaco Editor
Backend
├── Node.js
├── Express
├── JWT
└── REST API
Database
└── MongoDB
Infrastructure
├── Redis
├── Docker
└── Worker processes

For a resume, you could eventually describe it as:

Online Code Judge | MERN, Redis, Docker
Built a scalable coding platform supporting problem management, code submissions, automated test-case evaluation, isolated Docker-based execution, submission queues, and real-time verdict tracking.

MERN is actually a very good fit if you’re learning JavaScript/full-stack. You don’t need Spring Boot for this project.

Absolutely. If you’re going with MERN, I’d build the Online Code Judge in stages so that you always have a working project and add complexity gradually.

🚀 Online Code Judge — Development Plan

Final architecture

                    React
                      │
              ┌───────┴───────┐
              │               │
         Monaco Editor    Problem UI
              │
              ▼
        Node + Express
              │
       ┌──────┴──────┐
       │             │
    MongoDB        Redis
       │             │
       │             ▼
       │       Submission Queue
       │             │
       │             ▼
       │       Execution Worker
       │             │
       │             ▼
       │          Docker
       │             │
       │       Run User Code
       │             │
       └─────────────┘

⸻

Phase 0 — Project setup

Goal: Get the basic MERN application running.

Backend

/server
/src
/controllers
/models
/routes
/middlewares
/services
server.js

Install:

Node.js
Express
MongoDB
Mongoose
dotenv
cors

Frontend

/client

Install:

React
React Router
Axios
Tailwind
Monaco Editor

Deliverable

You should have:

React → Express → MongoDB

working before moving on.

⸻

Phase 1 — Authentication

Build:

Register
Login
Logout
Profile

MongoDB

User
├── username
├── email
├── passwordHash
├── role
└── createdAt

Use:

bcrypt
JWT

APIs

POST /api/auth/register
POST /api/auth/login
GET /api/auth/me

Deliverable

User can register and log in.

⸻

Phase 2 — Problem Management

Now build the actual coding platform.

Problem model

Problem
├── title
├── description
├── difficulty
├── constraints
├── examples
├── starterCode
└── createdAt

TestCase model

TestCase
├── problemId
├── input
├── expectedOutput
└── isHidden

Keep hidden test cases separate from what the frontend displays.

APIs

GET /api/problems
GET /api/problems/:id
POST /api/problems
PUT /api/problems/:id
DELETE /api/problems/:id

The last four should eventually be admin-only.

Deliverable

You can browse:

Problems
────────────────────────
Two Sum Easy
Binary Search Easy
Merge Intervals Medium
LRU Cache Hard

⸻

Phase 3 — Code Editor

Now create the problem-solving page.

┌─────────────────────────────────────────┐
│ Two Sum │
├──────────────────┬──────────────────────┤
│ Problem │ Monaco Editor │
│ │ │
│ Description │ function twoSum() { │
│ Examples │ ... │
│ Constraints │ } │
│ │ │
│ │ [Run] [Submit] │
├──────────────────┴──────────────────────┤
│ Output │
└─────────────────────────────────────────┘

Use Monaco Editor.

At this point, don’t worry about Docker yet.

⸻

Phase 4 — Build the first Judge

This is the core of the project.

Start with JavaScript only.

User submits:

console.log(2 + 3);

Your backend needs to:

Receive code
↓
Create temporary file
↓
Execute code
↓
Capture stdout
↓
Compare with expected output
↓
Return verdict

Initially:

POST /api/submissions

Response:

{
"status": "ACCEPTED",
"runtime": 21
}

Important

Don’t execute arbitrary user code directly on your production Node process.

For local development, you can experiment with child processes, but the real architecture should move execution into an isolated sandbox.

⸻

Phase 5 — Docker Sandbox

Now make the judge serious.

Node API
│
▼
Execution Worker
│
▼
Docker
│
├── User code
├── Input
└── Runtime

For every submission:

Create container
↓
Copy code
↓
Compile/run
↓
Feed test cases
↓
Capture output
↓
Destroy container

Apply restrictions such as:

CPU limit
Memory limit
Execution timeout
No network
Restricted filesystem

This is one of the most valuable parts of the project for interviews.

⸻

Phase 6 — Submission System

Create:

Submission
├── userId
├── problemId
├── language
├── code
├── status
├── runtime
├── memory
├── error
└── createdAt

Statuses:

QUEUED
RUNNING
ACCEPTED
WRONG_ANSWER
TIME_LIMIT_EXCEEDED
MEMORY_LIMIT_EXCEEDED
COMPILATION_ERROR
RUNTIME_ERROR

Now your UI can show:

Submission #182
✓ Accepted
Runtime: 42 ms
Memory: 31 MB

⸻

Phase 7 — Redis Queue

This is where the architecture becomes scalable.

Instead of:

React
↓
Node
↓
Run code immediately

do:

React
↓
Node
↓
Redis Queue
↓
Worker
↓
Docker

Example:

100 submissions
│
▼
┌────────────────────┐
│ Redis Queue │
│ │
│ S1 S2 S3 S4 S5 ... │
└─────────┬──────────┘
│
┌────┼────┐
▼ ▼ ▼
W1 W2 W3
│ │ │
▼ ▼ ▼
Docker Docker Docker

You can use BullMQ with Redis.

⸻

Phase 8 — Multiple Languages

Once JavaScript works properly, add:

JavaScript

Node.js

Python

Python runtime

C++

g++ → executable → run

Your submission now contains:

language: "cpp"

Worker decides:

if JavaScript → JS executor
if Python → Python executor
if C++ → C++ executor

Each language runs inside its own Docker environment.

⸻

Phase 9 — Submission History

Add:

My Submissions

Example:

## Problem Language Status Runtime

Two Sum C++ Accepted 24ms
LRU Cache JavaScript Wrong Answer 31ms
Binary Search Python Accepted 18ms

API:

GET /api/submissions/me
GET /api/submissions/:id

⸻

Phase 10 — User Profile & Stats

Profile:

Likith
────────────────────
Problems Solved: 87
Easy 42
Medium 34
Hard 11
Acceptance Rate: 73%
Languages
JavaScript ███████
C++ █████
Python ███

This makes the project feel like a real platform rather than just a code runner.

⸻

Phase 11 — Leaderboard

Add:

Leaderboard
────────────────────

1. Alex 1240
2. Rahul 1170
3. Likith 1095
4. John 980

You can calculate scores based on:

Problems solved
Difficulty
Contest performance

⸻

Phase 12 — Contest System

This is an excellent advanced feature.

Admin creates:

Contest
├── name
├── startTime
├── endTime
└── problems

Users participate.

During contest:

Problems
A - Two Sum
B - Binary Search
C - Graph
D - DP

Leaderboard updates as submissions are accepted.

⸻

Phase 13 — Real-Time Updates

Instead of the user refreshing:

Queued...
Queued...
Queued...

use:

WebSocket

Flow:

Submission
↓
Redis
↓
Worker
↓
Status changed
↓
WebSocket
↓
React

The UI instantly changes:

Queued
↓
Running
↓
Accepted

⸻

Phase 14 — Admin Dashboard

Admin should be able to:

Create problem
Edit problem
Delete problem
Add test cases
Hide/show problem
Create contests
View submissions

Dashboard:

┌────────────────────────────────┐
│ Admin Dashboard │
├────────────────────────────────┤
│ Problems 154 │
│ Users 12,421 │
│ Submissions 82,194 │
│ Active Contests 3 │
└────────────────────────────────┘

⸻

Phase 15 — Production polish

Finally add:

Security

JWT
Rate limiting
Input validation
CORS
Password hashing
Docker isolation
Resource limits

Backend quality

Error handling
Logging
Pagination
Caching
Database indexes

DevOps

Docker Compose
CI/CD
Environment variables
Health checks
Monitoring

⸻

🗓️ Suggested timeline

If you’re doing this alongside college/work:

Week Target
1 MERN setup + authentication
2 Problems + test cases
3 Monaco editor + submission API
4 Basic code execution
5 Docker sandbox
6 Redis + worker architecture
7 Multiple languages
8 Submission history + profiles
9 Leaderboard
10 Contest system
11 WebSockets + admin dashboard
12 Deployment + security + polish

You don’t need all 12 weeks for a resume-worthy project.

🎯 Minimum version I’d put on your resume

Get this working first:

React
↓
Monaco Editor
↓
Node + Express
↓
MongoDB
↓
Redis/BullMQ
↓
Worker
↓
Docker
↓
Code Execution
↓
Test Cases
↓
Verdict

Then support 3 languages + authentication + submission history.

That’s already a considerably stronger project than the typical:

“MERN E-commerce Website with Login, Cart and CRUD.”

And importantly, build the judge engine yourself rather than simply calling an external code-execution API. That gives you substantially more to discuss in an SDE interview.

For your MERN Online Code Judge, I would keep MongoDB design fairly clean. Don’t over-engineer it initially.

1. Database features

The database should support these major features:

👤 User Management

- User registration/login
- User profile
- Password hash
- Roles: USER, ADMIN
- Account creation date
- User statistics

📚 Problem Management

- Create problems
- Edit/delete problems
- Problem description
- Difficulty: Easy / Medium / Hard
- Tags: Array, DP, Graph, etc.
- Constraints
- Examples
- Supported languages
- Starter code

🧪 Test Case Management

- Public test cases
- Hidden test cases
- Expected output
- Input
- Time limit
- Memory limit

💻 Code Submissions

Store every submission:

- User
- Problem
- Language
- Source code
- Submission status
- Runtime
- Memory usage
- Error message
- Number of test cases passed
- Submission timestamp

📊 User Progress

- Problems solved
- Easy/Medium/Hard solved
- Submission count
- Acceptance rate
- Language statistics

🏆 Contests

Later you can support:

- Create contest
- Add problems
- Contest participants
- Contest submissions
- Contest leaderboard

🏷️ Problem Categories

Support:

- Topics/tags
- Difficulty
- Search
- Filtering
- Sorting

🔐 Admin

Admin can:

- Manage users
- Create/update problems
- Add test cases
- Manage contests
- View submissions

⸻

2. Database design

I’d start with 7 collections:

users
problems
testCases
submissions
tags
contests
contestParticipants

You don’t need everything on day one.

⸻

3. users

users
│
├── \_id
├── username
├── email
├── passwordHash
├── role
├── avatar
├── bio
├── stats
│ ├── problemsSolved
│ ├── easySolved
│ ├── mediumSolved
│ ├── hardSolved
│ ├── totalSubmissions
│ └── acceptedSubmissions
├── createdAt
└── updatedAt

Example:

{
"\_id": "user123",
"username": "likith",
"email": "user@example.com",
"passwordHash": "...",
"role": "USER",
"stats": {
"problemsSolved": 45,
"easySolved": 20,
"mediumSolved": 20,
"hardSolved": 5,
"totalSubmissions": 120,
"acceptedSubmissions": 78
}
}

Don’t store the actual password.

⸻

4. problems

This is the main collection.

problems
│
├── \_id
├── title
├── slug
├── description
├── difficulty
├── constraints
├── examples
├── starterCode
├── supportedLanguages
├── tags
├── timeLimit
├── memoryLimit
├── createdBy
├── isPublished
├── createdAt
└── updatedAt

Example:

{
"\_id": "problem123",
"title": "Two Sum",
"slug": "two-sum",
"description": "Given an array...",
"difficulty": "EASY",
"constraints": [
"2 <= nums.length <= 10000",
"-10^9 <= nums[i] <= 10^9"
],
"examples": [
{
"input": "[2,7,11,15], target = 9",
"output": "[0,1]"
}
],
"supportedLanguages": [
"javascript",
"python",
"cpp"
],
"tags": [
"array",
"hash-table"
],
"timeLimit": 2000,
"memoryLimit": 256,
"createdBy": "user123",
"isPublished": true
}

⸻

5. testCases

I recommend keeping test cases in a separate collection.

testCases
│
├── \_id
├── problemId
├── input
├── expectedOutput
├── isHidden
├── createdAt
└── updatedAt

Example:

{
"\_id": "test123",
"problemId": "problem123",
"input": "2 7 11 15\n9",
"expectedOutput": "0 1",
"isHidden": true
}

Why separate them?

Because a problem can have:

Problem
│
├── Test Case 1
├── Test Case 2
├── Test Case 3
├── Test Case 4
└── Test Case 5

And you don’t want to return hidden test cases when someone requests:

GET /api/problems/:id

⸻

6. submissions

This is one of the most important collections.

submissions
│
├── \_id
├── userId
├── problemId
├── language
├── sourceCode
├── status
├── runtime
├── memory
├── testCasesPassed
├── totalTestCases
├── error
├── createdAt
└── updatedAt

Example:

{
"\_id": "submission123",
"userId": "user123",
"problemId": "problem123",
"language": "javascript",
"sourceCode": "function twoSum(...) {...}",
"status": "ACCEPTED",
"runtime": 42,
"memory": 32,
"testCasesPassed": 10,
"totalTestCases": 10,
"error": null,
"createdAt": "..."
}

Possible statuses:

QUEUED
RUNNING
ACCEPTED
WRONG_ANSWER
TIME_LIMIT_EXCEEDED
MEMORY_LIMIT_EXCEEDED
COMPILATION_ERROR
RUNTIME_ERROR
SYSTEM_ERROR

⸻

7. tags

You could initially store tags directly inside the problem:

"tags": ["array", "hash-table"]

That’s actually enough for v1.

But if you want proper tag management:

tags
│
├── \_id
├── name
└── slug

Example:

{
"\_id": "tag123",
"name": "Dynamic Programming",
"slug": "dynamic-programming"
}

Then a problem can reference:

"tags": [
"tag123",
"tag456"
]

For your first version, I’d keep tags as strings. Simpler.

⸻

8. contests

Add this later.

contests
│
├── \_id
├── title
├── description
├── startTime
├── endTime
├── problems
├── createdBy
├── isPublished
├── createdAt
└── updatedAt

Example:

{
"\_id": "contest123",
"title": "Weekly Contest #1",
"description": "Solve these problems...",
"startTime": "...",
"endTime": "...",
"problems": [
"problem123",
"problem456",
"problem789"
],
"createdBy": "admin123",
"isPublished": true
}

⸻

9. contestParticipants

Don’t put all participants inside the contest document if you expect large contests.

contestParticipants
│
├── \_id
├── contestId
├── userId
├── score
├── rank
├── joinedAt
└── solvedProblems

Example:

{
"contestId": "contest123",
"userId": "user123",
"score": 450,
"rank": 12,
"solvedProblems": [
"problem123",
"problem456"
],
"joinedAt": "..."
}

⸻

10. Relationships

Your overall database looks like this:

                     ┌──────────────┐
                     │    USERS     │
                     └──────┬───────┘
                            │
                  ┌─────────┴─────────┐
                  │                   │
                  ▼                   ▼
           ┌─────────────┐     ┌──────────────┐
           │ SUBMISSIONS │     │   CONTESTS   │
           └──────┬──────┘     └──────┬───────┘
                  │                   │
                  │                   │
                  ▼                   ▼
           ┌─────────────┐     ┌──────────────────┐
           │  PROBLEMS   │     │ CONTEST          │
           └──────┬──────┘     │ PARTICIPANTS     │
                  │             └──────────────────┘
                  │
                  ▼
           ┌─────────────┐
           │ TEST CASES  │
           └─────────────┘

More specifically:

User 1 ──────────── N Submissions
Problem 1 ───────── N Submissions
Problem 1 ───────── N TestCases
User 1 ──────────── N ContestParticipants
Contest 1 ───────── N ContestParticipants
Contest N ───────── N Problems

⸻

11. MongoDB indexes

This is important if you want to show backend knowledge.

Users

email → unique index
username → unique index

Problems

slug → unique index
difficulty → index
tags → index

Submissions

userId → index
problemId → index
createdAt → index

And particularly:

{
userId: 1,
createdAt: -1
}

for:

GET /api/submissions/me

⸻

12. One important design decision

Don’t store test-case results for every submission initially.

You might think:

submission
├── testCase1 → passed
├── testCase2 → passed
├── testCase3 → failed
├── testCase4 → passed
...

This can make the submission document unnecessarily large.

For v1, just store:

{
"testCasesPassed": 8,
"totalTestCases": 10,
"status": "WRONG_ANSWER"
}

Later, if you need detailed debugging/admin information, introduce a separate submissionResults collection.

⸻

🎯 Recommended V1 database

Don’t build all 7 collections immediately.

Start with just:

┌──────────────┐
│ users │
└──────┬───────┘
│
▼
┌──────────────┐ ┌──────────────┐
│ submissions │──────►│ problems │
└──────────────┘ └──────┬───────┘
│
▼
┌──────────────┐
│ testCases │
└──────────────┘

V1:

1. users
2. problems
3. testCases
4. submissions

V2:

5. contests
6. contestParticipants

And use Redis separately for the submission queue—don’t put queued jobs into MongoDB unless you have a specific reason.

This gives you a clean foundation for the MERN judge without overcomplicating the database.
