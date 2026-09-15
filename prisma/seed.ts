import "dotenv/config";
import { PrismaClient, type SystemRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Every account is created with the same starter password from the environment.
// Change it before you invite anyone in.
const DEFAULT_PASSWORD = process.env.SEED_DEFAULT_PASSWORD ?? "ChangeMe!2026";

type Person = {
  key: string;
  name: string;
  email: string;
  phone: string;
  title: string;
  department: string;
  systemRole: SystemRole;
  reportsTo?: string;
  responsibilities: string[];
};

const people: Person[] = [
  {
    key: "zeeshan_malik",
    name: "Zeeshan Malik",
    email: "zeemalik0110@gmail.com",
    phone: "+923097325208",
    title: "CEO & Senior Technical Lead",
    department: "Leadership",
    systemRole: "CEO",
    responsibilities: [
      "Executive leadership",
      "Technical leadership",
      "Project oversight",
      "Employee management",
      "Business decisions",
      "Strategic planning",
    ],
  },
  {
    key: "arslan",
    name: "Arslan Mustafa",
    email: "marslanmustafa391@gmail.com",
    phone: "+92 307 4188483",
    title: "Senior Full Stack Developer",
    department: "Engineering",
    systemRole: "MANAGER",
    reportsTo: "zeeshan_malik",
    responsibilities: [
      "Full stack development",
      "Admin panel development",
      "Backend architecture",
      "Server deployments",
      "Technical coordination",
    ],
  },
  {
    key: "hassaan",
    name: "Hassaan Mehboob",
    email: "hassaanmehboob789@gmail.com",
    phone: "+923264226348",
    title: "Junior Web Developer",
    department: "Engineering",
    systemRole: "EMPLOYEE",
    reportsTo: "arslan",
    responsibilities: [
      "BarberzLink Website",
      "CosmoLink Website",
      "DivineeSoft Websites",
      "HRM Web Software",
    ],
  },
  {
    key: "falaq",
    name: "Falaq Bilal",
    email: "falaqxhk@gmail.com",
    phone: "+923244201252",
    title: "Flutter App Developer",
    department: "Mobile",
    systemRole: "EMPLOYEE",
    reportsTo: "zeeshan_malik",
    responsibilities: [
      "BarberzLink Mobile App",
      "BarberzLink Web App",
      "BarberzLink Admin Panal",
    ],
  },
  {
    key: "zainab",
    name: "Zainab Ehsaan",
    email: "zainabehsan84@gmail.com",
    phone: "+923174862979",
    title: "Flutter App Developer",
    department: "Mobile",
    systemRole: "EMPLOYEE",
    reportsTo: "zeeshan_malik",
    responsibilities: [
      "CosmoLink Mobile App",
      "CosmoLink Web App",
      "CosmoLink Admin Panal",
    ],
  },
  {
    key: "zeeshan_hr",
    name: "Zeeshan",
    email: "zeeshandevsinn@gmail.com",
    phone: "+923146256754",
    title: "HR & Employee Management",
    department: "People",
    systemRole: "MANAGER",
    reportsTo: "zeeshan_malik",
    responsibilities: [
      "HR management",
      "Employee management",
      "Daily employee coordination",
      "People operations",
    ],
  },
  {
    key: "adila",
    name: "Adila Zahid",
    email: "adilazahid@gmail.com",
    phone: "+923227311427",
    title: "Business Developer for Upwork Growth",
    department: "Business Development",
    systemRole: "EMPLOYEE",
    reportsTo: "zeeshan_malik",
    responsibilities: [
      "Upwork Growth Bidding and Optimization",
      "Client acquisition",
      "Proposal writing",
      "Business development",
    ],
  },
];

type Proj = {
  name: string;
  platforms?: string[];
  lead: string;
  manager?: string;
  description: string;
};

const projects: Proj[] = [
  { name: "BarberzLink Mobile App", platforms: ["iOS", "Android"], lead: "falaq", manager: "zeeshan_malik", description: "Customer-facing barber booking mobile application." },
  { name: "CosmoLink Mobile App", platforms: ["iOS", "Android"], lead: "zainab", manager: "zeeshan_malik", description: "Customer-facing salon booking mobile application." },
  { name: "BarberzLink Website", platforms: ["Web"], lead: "hassaan", manager: "arslan", description: "Marketing website for BarberzLink." },
  { name: "CosmoLink Website", platforms: ["Web"], lead: "hassaan", manager: "arslan", description: "Marketing website for CosmoLink." },
  { name: "BarberzLink Admin Panal", platforms: ["Web"], lead: "arslan", manager: "zeeshan_malik", description: "Admin panel for BarberzLink operations and management." },
  { name: "CosmoLink Admin Panal", platforms: ["Web"], lead: "arslan", manager: "zeeshan_malik", description: "Admin panel for CosmoLink operations and management." },
  { name: "BarberzLink Web App", platforms: ["Web"], lead: "falaq", manager: "zeeshan_malik", description: "Web application for BarberzLink." },
  { name: "CosmoLink Web App", platforms: ["Web"], lead: "zainab", manager: "zeeshan_malik", description: "Web application for CosmoLink." },
  { name: "BarberzLink Backend and Server Deployments", platforms: ["API", "Infra"], lead: "arslan", manager: "zeeshan_malik", description: "Back-end services and deployment infrastructure for BarberzLink." },
  { name: "CosmoLink Backend and Server Deployments", platforms: ["API", "Infra"], lead: "arslan", manager: "zeeshan_malik", description: "Back-end services and deployment infrastructure for CosmoLink." },
  { name: "DivineeSoft Websites", platforms: ["Web"], lead: "hassaan", manager: "arslan", description: "Website portfolio and marketing efforts for DivineeSoft." },
  { name: "HRM Web Software", platforms: ["Web"], lead: "hassaan", manager: "zeeshan_malik", description: "Internal HR management platform." },
  { name: "Upwork Growth Bidding and Optimization", platforms: ["Growth"], lead: "adila", manager: "zeeshan_malik", description: "Profile optimization, bid strategy and business growth via Upwork." },
  { name: "HR Management", platforms: ["Operations"], lead: "zeeshan_hr", manager: "zeeshan_malik", description: "People operations, employee coordination and internal HR management." },
];

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const daysFromNow = (n: number) => new Date(Date.now() + n * 86_400_000);

async function main() {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);
  const employeeIds = new Map<string, string>();
  const userIds = new Map<string, string>();

  await prisma.user.deleteMany({
    where: {
      OR: [
        { email: "zeeshan.malik@divineesoft.com" },
        { email: { endsWith: "@divineesoft.com" } },
      ],
    },
  });

  // Users and employees first, then the reporting lines (self-referencing).
  for (const person of people) {
    const user = await prisma.user.upsert({
      where: { email: person.email },
      update: { name: person.name, systemRole: person.systemRole },
      create: {
        email: person.email,
        name: person.name,
        passwordHash,
        systemRole: person.systemRole,
        employee: {
          create: {
            title: person.title,
            department: person.department,
            phone: person.phone,
            responsibilities: person.responsibilities,
          },
        },
      },
      include: { employee: true },
    });
    const employee = user.employee ?? await prisma.employee.create({
      data: {
        userId: user.id,
        title: person.title,
        department: person.department,
        phone: person.phone,
        responsibilities: person.responsibilities,
      },
    });
    userIds.set(person.key, user.id);
    employeeIds.set(person.key, employee.id);
  }

  for (const person of people) {
    if (!person.reportsTo) continue;
    await prisma.employee.update({
      where: { id: employeeIds.get(person.key)! },
      data: { reportsToId: employeeIds.get(person.reportsTo)! },
    });
  }

  for (const person of people) {
    const employeeId = employeeIds.get(person.key)!;
    await prisma.employee.update({
      where: { id: employeeId },
      data: {
        phone: person.phone,
        title: person.title,
        department: person.department,
        responsibilities: person.responsibilities,
      },
    });
  }

  const projectIds = new Map<string, string>();
  for (const p of projects) {
    const project = await prisma.project.upsert({
      where: { name: p.name },
      update: {
        slug: slug(p.name),
        description: p.description,
        platforms: p.platforms ?? [],
        status: "ACTIVE",
        leadId: employeeIds.get(p.lead)!,
        managerId: p.manager ? employeeIds.get(p.manager)! : null,
      },
      create: {
        name: p.name,
        slug: slug(p.name),
        description: p.description,
        platforms: p.platforms ?? [],
        status: "ACTIVE",
        startedAt: new Date(),
        leadId: employeeIds.get(p.lead)!,
        managerId: p.manager ? employeeIds.get(p.manager)! : null,
      },
    });
    projectIds.set(p.name, project.id);

    const members = new Set([p.lead, ...(p.manager ? [p.manager] : [])]);
    for (const member of members) {
      await prisma.projectMember.upsert({
        where: { projectId_employeeId: { projectId: project.id, employeeId: employeeIds.get(member)! } },
        update: {},
        create: {
          projectId: project.id,
          employeeId: employeeIds.get(member)!,
          roleOnProject: member === p.manager ? "Manager" : "Lead developer",
        },
      });
    }
  }

  await prisma.automationRule.upsert({
    where: { key: "daily_briefing" },
    update: {},
    create: {
      key: "daily_briefing",
      name: "Morning task emails and CEO briefing",
      description: "Runs at 09:00 company time. Sends every employee their board and the CEO the company briefing.",
      enabled: true,
      config: { hour: 9 },
    },
  });
  await prisma.automationRule.upsert({
    where: { key: "ai_task_autoassign" },
    update: {},
    create: {
      key: "ai_task_autoassign",
      name: "Let the assistant assign tasks without approval",
      description:
        "Off by default. While off, every task the assistant creates is saved as a suggestion for the CEO to approve.",
      enabled: true,
      autoAssign: false,
    },
  });
  await prisma.automationRule.upsert({
    where: { key: "overdue_alerts" },
    update: {},
    create: {
      key: "overdue_alerts",
      name: "Overdue and deadline emails",
      description: "Deadline warnings hourly, an overdue digest once a day.",
      enabled: true,
    },
  });

  // A small amount of starter work so the dashboard has something to show on day one.
  const ceoUserId = userIds.get("zeeshan_malik")!;
  const starters: {
    title: string;
    project: string;
    assignee: string;
    priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    dueInDays: number;
    description: string;
  }[] = [
    {
      title: "Set the delivery milestones for the BarberzLink app",
      project: "BarberzLink Mobile App",
      assignee: "falaq",
      priority: "HIGH",
      dueInDays: 3,
      description: "Break the remaining app work into dated milestones so the dashboard can track slippage.",
    },
    {
      title: "Set the delivery milestones for the CosmoLink app",
      project: "CosmoLink Mobile App",
      assignee: "zainab",
      priority: "HIGH",
      dueInDays: 3,
      description: "Same exercise as BarberzLink: dated milestones for the remaining scope.",
    },
    {
      title: "Document the deployment steps for both backends",
      project: "BarberzLink Backend and Server Deployments",
      assignee: "arslan",
      priority: "MEDIUM",
      dueInDays: 5,
      description: "A written runbook so deployment is not a single-person dependency.",
    },
    {
      title: "Publish the DivineeSoft site content pass",
      project: "DivineeSoft Websites",
      assignee: "hassaan",
      priority: "MEDIUM",
      dueInDays: 7,
      description: "Fill in the services and portfolio sections with real copy.",
    },
    {
      title: "Rewrite the Upwork profile headline and portfolio",
      project: "Upwork Growth Bidding and Optimization",
      assignee: "adila",
      priority: "HIGH",
      dueInDays: 4,
      description: "Target the two verticals we actually ship: booking apps and admin panels.",
    },
    {
      title: "Collect current status from every team member",
      project: "HR Management",
      assignee: "zeeshan_hr",
      priority: "MEDIUM",
      dueInDays: 2,
      description: "One short written status per person so the first week of data is real.",
    },
  ];

  for (const starter of starters) {
    const exists = await prisma.task.findFirst({ where: { title: starter.title } });
    if (exists) continue;
    await prisma.task.create({
      data: {
        title: starter.title,
        description: starter.description,
        projectId: projectIds.get(starter.project)!,
        assigneeId: employeeIds.get(starter.assignee)!,
        createdById: ceoUserId,
        priority: starter.priority,
        dueDate: daysFromNow(starter.dueInDays),
        scheduledFor: daysFromNow(0),
        estimatedMinutes: 120,
        approvalState: "APPROVED",
        approvedById: ceoUserId,
        approvedAt: new Date(),
      },
    });
  }

  const dailyStandup = await prisma.task.findFirst({ where: { title: "Post your daily update", isRecurring: true } });
  if (!dailyStandup) {
    await prisma.task.create({
      data: {
        title: "Post your daily update",
        description: "What you did, what is next, anything blocking you.",
        createdById: ceoUserId,
        assigneeId: employeeIds.get("zeeshan_hr")!,
        isRecurring: true,
        recurrenceRule: "WEEKDAYS",
        priority: "LOW",
        estimatedMinutes: 10,
      },
    });
  }

  console.log(`Seeded ${people.length} people, ${projects.length} projects, ${starters.length} starter tasks.`);
  console.log(`Every account uses the password in SEED_DEFAULT_PASSWORD. Sign in as ${people[0].email}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
