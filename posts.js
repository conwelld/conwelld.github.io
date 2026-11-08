/*
  BLOG POSTS

  To publish a new post, copy this template into the list below and fill it in.
  Order doesn't matter: posts are sorted by date, newest first.

  {
    slug: "my-post-name",       // the post's link: conwelld.github.io/#blog/my-post-name
    date: "2026-11-05",         // YYYY-MM-DD
    title: "Post title",
    storyPoints: 0,             // optional: story points completed so far
    tags: ["Open source"],      // optional
    prompt: `...`,              // optional: the assignment prompt, shown collapsed above the post
    body: `
## A section heading

A paragraph. Leave an empty line between paragraphs.

- A bullet point
- A bullet with a [link](https://github.com/conwelld)
`
  },

  Inside body and prompt: "## " starts a heading, "- " starts a bullet,
  [text](url) is a link, and **text** is bold. Everything else shows exactly
  as you typed it. Don't type a backtick (`) inside body or prompt.
*/

const blogPosts = [
  {
    slug: "midterm-reflection",
    date: "2026-11-08",
    title: "Midterm Reflection: Growth So Far",
    storyPoints: 3,
    tags: ["Reflection", "Afrotech", "Progress update"],
    prompt: `
- Now that midterms are behind you, reflect on your growth as a software engineer so far this semester. What went well? What didn't go as planned? Consider your study habits, time management, technical skills, and collaboration with others. Identify one specific habit or strategy you want to change for the second half of the semester, and explain why. Conclude with a concrete action plan for how you will implement that change.
- Then, include a progress update section where you discuss the story points you have completed so far. State the number of story points you have completed, and explain why that number is what it is. Consider what tasks were completed, how difficult or easy they were compared to your estimates, any blockers or delays, changes in scope, team dynamics, or learning curves that affected your progress. If you have completed zero story points so far, state that clearly and explain why. For other contributions outside of resolved issues, discuss how they were important to the application, and what you learned from your contribution.
`,
    body: `
## Growth this semester

The things that have gone well this semester in Software Engineering do not really have to do with anything technical, since I just got back from Afrotech. I have not made any significant contributions or developments in learning new technologies or repos. I have spent the bulk of my time networking with people in the positions I want to be in, including engineers at companies like Riot, Netflix, and Expedia, just to name a few. In doing so, I gained valuable insights into how the field operates in this current state of AI. In addition to gaining insight into the current state of what makes a good software engineer, I have also learned how to be a better communicator and people person, which is something I definitely did not expect. However, many things have hindered my growth as a software engineer, one of which is the time I have not spent on LeetCode and honing my lower-level CS knowledge. In today’s day and age, coding is no longer as valuable as it was before; now the emphasis is on system design and reviewing code rather than writing it, so I wish to spend more time on that as well.

Furthermore, the amount of time spent applying to internships and other extracurricular activities takes up so much of my time that it is difficult to find something to contribute to, so I am very behind on that; hopefully it will pick up this week. In addition is I have to follow up on everything and everyone I talked to at Afrotech because that is something that is now necessary to do given the current job market, coding is not enough on its own anymore Something I want to change this next semester is to set specific times to hone my technical skills and contribute. I say that because contributing is such a loose objective to complete, so it is incredibly easy to dismiss; I need smaller objectives, and I plan to do that this next go around. My concrete action plan is to set aside time in my week to see what repositories I want to contribute to, mark myself done, and give myself a deadline to complete the issue. Obviously, this does not mean merging because I can not control it. I want at least one major contribution a week; a major contribution to me is anything in a repository people are actually using outside of campus, and every two weeks I will measure my progress and see what to do differently or if there are other technologies or subjects to do.

## Progress update

My progress update is the same as my last reflection because I took a week off for Afrotech and had no time for anything other than the conference. I learned more there than I would have in that time period solely online, so it is a worthwhile endeavor. That means more time will be dedicated to contributions this week. There should be no blockers for this upcoming week unless I have anan interview scheduled,; that will take priority for me personally. I have a plan devised for contributing this week.
`
  },
  {
    slug: "open-source-reflection",
    date: "2026-10-22",
    title: "Open Source as a User, Student, and Contributor",
    storyPoints: 3,
    tags: ["Open source", "Reflection", "Progress update"],
    prompt: `
- Reflect on your relationship with open source as a user, a student, and a contributor. In your blog post, navigate the tension between the pros and cons of open-source software. Conclude with a clear thesis: Do you believe open-source is an effective model for building critical software infrastructure, despite its flaws? Defend your thesis using ethical reasoning and technical evidence.
- Then, include a progress update section where you discuss the story points you have completed so far. State the number of story points you have completed, and explain why that number is what it is. Consider what tasks were completed, how difficult or easy they were compared to your estimates, any blockers or delays, changes in scope, team dynamics, or learning curves that affected your progress. If you have completed zero story points so far, state that clearly and explain why.
`,
    body: `
## My relationship with open source

My relationship with open source as a user has been pretty positive, as I enjoy the aspect of community as in I am able to report bug fixes directly to the people who are manufacturing the application like Godot, since I am collaborating with people to design a game I am able to report the things that are arduous to increase the enjoyable aspects of the application for other users out there. as a student i find it equally enjoyable due to the fact that I am able to learn so much from how these communities operate not only for this class but how operations grow in size in accordance to a larger user base and how the code changes with it, I am also able to learn through my workings as a contributor and I think they really mean the same thing in the open source context. I think the pros vastly outweigh the cons of open source software because it is free and it allows for anyone anywhere to be able to contribute to the applications they love and that is frankly what i imagine is the ideal for software engineering it should not be something that is hard to access it should be a tool anyone can learn from, which leads e to my only negative which is the elitism that comes with being a seasoned developer, a lot of first time contributors get shot down due to their inexperience with contributing code and maintainers can be harsh and discouraging and can make people never want to contribute again (like Linus Torvalds) I think all in all this is what makes open source an effective model for building critical software because it goes through so many eys and perspefctives that it is hard to imagine the large multitude of bugs to fixed, it gives the sense of community in the way that it only really gets better with the integrated use of tools like AI and developers learning and outputting so much more, which leads to things costing less and making things more applicable to a larger audience.

## Progress update

As far as progress I have completed like 3 story points the number is the way it is because I tend to get stuck on issues before they actually get merged in my head I am still in teh summer where I could only have at max two issues at one time and this new workflow is a bit jarring after that was drilled into my head so much, so I have only really been doing simple bug fixes and they were very easy given my past experiences and one was harder than expected but that was due to the lookup time it took to traverse field and navigate a new codebase the biggest delays for me will always be merging and getting people to actually review your stuff. And not having someone continuously there to review your prs and give legit feedback and not being able to merge your prs or send it back immediately is the biggest learning curve for me because I depended on that so heavily in my learning over the summer and is osomehting I will have to expect in tehse large open source containers
`
  }
];
