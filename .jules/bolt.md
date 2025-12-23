## 2024-07-25 - Verify Staged Files Before Commit

**Learning:** During a code review, it was discovered that I had accidentally staged `dev.log` and a modified `next-env.d.ts`. Including log files and auto-generated environment files in a commit is a mistake that can lead to merge conflicts and expose sensitive information.

**Action:** Before submitting any change, I will now always run `git status` or a similar command to carefully review the list of staged files. I will ensure that only intentionally modified, relevant source code files are included in the commit.
