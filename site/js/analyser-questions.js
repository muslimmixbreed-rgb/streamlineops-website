// Business Analyser questions. Edit freely: add, remove or reword statements.
// Each statement is rated 1 (Not at all) to 5 (Always), or "Not sure".
// "service" is the StreamlineOps service shown when this area has a gap; it must match
// an id in SERVICES below (and an anchor on services.html).

window.SO_SERVICES = {
  process:  { name: 'Process review & mapping',      anchor: 'process' },
  excel:    { name: 'Excel trackers & dashboards',   anchor: 'excel' },
  sops:     { name: 'SOPs & checklists',             anchor: 'sops' },
  kpis:     { name: 'KPIs & performance',            anchor: 'kpis' },
  projects: { name: 'Change projects',               anchor: 'projects' },
  routines: { name: 'Team routines',                 anchor: 'routines' }
};

window.SO_SCALE = ['Not at all', 'Rarely', 'Sometimes', 'Mostly', 'Always'];

window.SO_PROFILE = {
  sectors: ['Hospitality & food', 'Retail', 'Trades & construction', 'Professional services', 'Health, beauty & wellbeing',
            'Manufacturing', 'Logistics & field service', 'Charity or non-profit', 'Other'],
  sizes: ['Just me', '2–5 people', '6–15 people', '16–50 people', 'More than 50'],
  ages: ['Less than a year', '1–3 years', '3–10 years', 'More than 10 years']
};

window.SO_AREAS = [
  {
    id: 'process', title: 'Processes & workflow',
    intro: 'How work moves through the business, from the first request to the finished job.',
    services: ['process', 'projects'],
    statements: [
      'Our key processes (for example taking an order, delivering a job, invoicing) are clearly defined and done the same way each time.',
      'Work passes between people without things getting lost or delayed.',
      'Information is entered once, not re-typed into several places.',
      'If a key person is off, the work still gets done.',
      'We rarely have to fix mistakes or redo work.'
    ]
  },
  {
    id: 'tools', title: 'Tools & spreadsheets',
    intro: 'The spreadsheets, systems and files the business runs on.',
    services: ['excel', 'process'],
    statements: [
      'Everyone works from one up-to-date version of our key files and information.',
      'We can see the status of all current jobs or orders in one place.',
      'Our spreadsheets or systems are easy to update and hard to break.',
      'Regular reports take little time to put together.',
      'The tools we use fit how we actually work, without lots of workarounds.'
    ]
  },
  {
    id: 'standards', title: 'Procedures, measures & routines',
    intro: 'Written procedures, the numbers you track, and how the team stays aligned.',
    services: ['sops', 'kpis', 'routines'],
    statements: [
      'Important tasks have written, up-to-date instructions.',
      'New starters can get up to speed without relying on one person.',
      'We track a few key numbers that show whether the business is on track.',
      'We review those numbers regularly and act on what they show.',
      'We have regular team routines, such as handovers or check-ins, that keep everyone aligned.'
    ]
  },
  {
    id: 'customers', title: 'Customers & growth',
    intro: 'How enquiries, customers and repeat business are handled.',
    services: ['process', 'excel', 'kpis'],
    statements: [
      'Every enquiry is logged and followed up quickly.',
      'We know where our new customers come from.',
      'We follow up with past customers for repeat work or referrals.',
      'We regularly ask customers for feedback and act on it.',
      'We know which products, services or customers make us the most money.'
    ]
  }
];
