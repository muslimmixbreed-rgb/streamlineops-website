// Business Analyser: the stages and domains the analyser works through, in order.
// Edit the wording freely. Each domain's "focus" tells the AI what to look at.
// Ratings come back as STRONG, MODERATE or WEAK. "service" ids must match SO_SERVICES.

window.SO_SERVICES = {
  process:  { name: 'Process review & mapping',    anchor: 'process' },
  excel:    { name: 'Excel trackers & dashboards', anchor: 'excel' },
  sops:     { name: 'SOPs & checklists',           anchor: 'sops' },
  kpis:     { name: 'KPIs & performance',          anchor: 'kpis' },
  projects: { name: 'Change projects',             anchor: 'projects' },
  routines: { name: 'Team routines',               anchor: 'routines' }
};

window.SO_RATINGS = {
  STRONG:   { label: 'Strong',          cls: 'good', score: 100 },
  MODERATE: { label: 'Room to improve', cls: 'mid',  score: 50 },
  WEAK:     { label: 'Gap',             cls: 'low',  score: 0 }
};

window.SO_STAGES = [
  {
    id: 's7', tag: 'Stage 1 of 2', title: 'McKinsey 7S',
    intro: 'The McKinsey 7S model looks at seven connected parts of an organisation. When they line up, the business runs smoothly; when one is out of step, it pulls the others with it.',
    domains: [
      { id: 'strategy', title: 'Strategy', focus: 'How the business intends to compete and grow: a clear direction, priorities and a sense of what it will and will not do.' },
      { id: 'structure', title: 'Structure', focus: 'How the business is organised: who does what, who reports to whom, and where decisions get made.' },
      { id: 'systems', title: 'Systems', focus: 'The day-to-day processes, procedures and tools used to get work done, and how well they support the work.' },
      { id: 'values', title: 'Shared values', focus: 'What the business stands for and whether the team shares the same idea of what good work and good service look like.' },
      { id: 'style', title: 'Style', focus: 'How the owner or managers lead: how involved they are day to day, how decisions are made and how problems are handled.' },
      { id: 'staff', title: 'Staff', focus: 'The people: whether there are enough of the right people, and how they are recruited, onboarded and developed.' },
      { id: 'skills', title: 'Skills', focus: 'The capabilities the business has, where they sit, and whether key know-how depends on one or two people.' }
    ]
  },
  {
    id: 'ops', tag: 'Stage 2 of 2', title: 'Operations',
    intro: 'Seven operational domains that show where work gets stuck day to day, and where time, money and customers are being lost.',
    domains: [
      { id: 'process', title: 'Processes & workflow', focus: 'How work moves from the first request to the finished job: hand-offs, delays, duplicated effort and rework.' },
      { id: 'people', title: 'People & roles', focus: 'Whether everyone knows what they own, whether work depends on particular individuals, and how cover works when someone is away.' },
      { id: 'tools', title: 'Tools, systems & data', focus: 'The spreadsheets, software and files the business relies on: versions, re-keying, visibility and how fragile they are.' },
      { id: 'standards', title: 'Procedures & standards', focus: 'Whether important tasks are done the same good way every time, and whether that way is written down anywhere.' },
      { id: 'measures', title: 'Performance & measures', focus: 'Whether the business tracks a few key numbers, reviews them regularly and spots problems before customers do.' },
      { id: 'customers', title: 'Customer journey', focus: 'How enquiries are handled, how customers are kept informed, and how follow-up, feedback and repeat business work.' },
      { id: 'capacity', title: 'Capacity & growth', focus: 'Whether the business could take on more work without things breaking, and how ready it is for its next stage of growth.' }
    ]
  }
];
