// ---------------------------------------------------------------------------
// Content populated from Rushd's resume. Edit freely to update the site.
// Everything the site renders comes from here, so you shouldn't need to touch
// the components.
// ---------------------------------------------------------------------------

export const profile = {
  name: "Rushd AlAshqar",
  role: "Honors Computer Science @ Western · Software Developer",
  intro:
    "Fourth-year Honors Computer Science student at Western University building AI agents, autonomous systems, and full-stack software in Python and C++. I like turning messy real-world problems into reliable, well-tested systems.",
  location: "London, ON",
};

export const about = {
  paragraphs: [
    "I'm pursuing an Honors Specialization in Computer Science with a minor in Software Engineering at the University of Western Ontario (expected May 2027). My work spans AI, autonomous systems, and low-level systems programming.",
    "As an AI Model Trainer at Outlier, I designed and evaluated optimized prompts for RLHF, debugged large datasets to surface systematic model errors, and documented failure patterns that fed into AI safety improvements. Outside of that I build hands-on projects — from a C++ home-security system on the Raspberry Pi to an autonomous vehicle motion-planning stack and an agent that hunts down CS internships on its own.",
  ],
  // Pulled from the resume's Technical Skills section.
  skills: [
    "Java",
    "Python",
    "C / C++",
    "Go",
    "SQL",
    "React",
    "FastAPI",
    "OpenCV",
    "ROS2",
    "Docker",
    "Git",
    "Linux",
  ],
};

export const projects = [
  {
    title: "Security Monitoring System",
    description:
      "A modular C++ home security system with motion detection, live camera feeds, microphone input, and alarm management. Integrated Raspberry Pi camera and audio via OpenCV pipelines for real-time event detection, with multithreaded event processing for concurrent sensors — validated on Linux with CMake and GTest.",
    tags: ["C++", "Raspberry Pi", "OpenCV", "CMake", "GTest"],
    href: "https://github.com/The-Sole-King",
  },
  {
    title: "WEAP — Western Engineering Autopilot Project",
    description:
      "Trajectory generation and motion-planning modules for a fully software-based autonomous vehicle simulation stack. Implemented PD/PID steering and speed controllers to improve path-tracking stability, and integrated planning with perception and localization pipelines on QNX-based vehicle infrastructure.",
    tags: ["Python", "C++", "ROS2", "QNX"],
    href: "https://github.com/The-Sole-King",
  },
  {
    title: "ATLAS — Autonomous Job Search Agent",
    description:
      "An autonomous agent that continuously scans Canadian job boards for CS internship and co-op postings, filtering by relevance over time. Built on a modular controller–planner architecture with JSON-only actions, validation guards, and loop caps, plus Selenium scraping pipelines and a profile-based scoring system to surface the best-fit roles.",
    tags: ["Python", "FastAPI", "Selenium", "OpenAI API"],
    href: "https://github.com/The-Sole-King",
  },
];

// Contact / social links. `handle` is the visible label, `href` the target.
export const links = [
  {
    label: "Email",
    handle: "rushdalashqar@hotmail.com",
    href: "mailto:rushdalashqar@hotmail.com",
  },
  {
    label: "GitHub",
    handle: "@The-Sole-King",
    href: "https://github.com/The-Sole-King",
  },
  {
    label: "LinkedIn",
    handle: "in/rushd-alashqar",
    href: "https://linkedin.com/in/rushd-alashqar",
  },
  { label: "Phone", handle: "437-425-4440", href: "tel:+14374254440" },
];
