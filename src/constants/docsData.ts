import {
  Bell,
  ShieldCheck,
  TrendingUp,
  Globe,
  BookOpen,
  FileText,
  Info,
  Smartphone,
  MessageSquare,
  Layout,
  Book,
  History,
  FileCheck,
  Sparkles
} from 'lucide-react';

export interface MediaItem {
  type: 'image' | 'video';
  url: string;
  caption?: string;
}

export interface DocSection {
  title?: string;
  content: string;
  media?: MediaItem;
}

export interface DocItem {
  id: string;
  title: string;
  category: 'updates' | 'guidelines' | 'policies' | 'features';
  description: string;
  content: string;
  date?: string;
  version?: string;
  icon: any;
  tags: string[];
  media?: MediaItem;
  sections?: DocSection[];
}

export const docsData: DocItem[] = [
  {
    id: 'whatsapp-integration',
    version: 'v1.3.0',
    date: 'Dec 22, 2024',
    title: 'WhatsApp Integration',
    category: 'updates',
    description: 'Direct communication capabilities within the lead details page.',
    icon: Globe,
    tags: ['whatsapp', 'communication', 'multi-channel'],
    content: `
      <h2>Overview</h2>
      <p>Communicate directly with your leads using our new WhatsApp integration. No more switching apps!</p>
      
      <h3>Key Capabilities</h3>
      <ul>
        <li><strong>Direct Messaging:</strong> Send messages to leads directly from their profile.</li>
        <li><strong>History:</strong> All messages are logged automatically in the activity timeline.</li>
        <li><strong>Media Support:</strong> Send images, PDFs, and documents with ease.</li>
      </ul>

      <div class="p-4 bg-blue-50 border-l-4 border-blue-500 my-4 text-blue-700">
        <strong>Pro Tip:</strong> Use templates to speed up your response time for common inquiries!
      </div>
    `,
    media: {
      type: 'video',
      url: 'https://crm.gopocket.in/files/19.12.2025_14.07.56_REC.mp4',
      caption: 'Direct WhatsApp messaging interface'
    }
  },
  {
    id: 'KYC-Tracker',
    version: 'v1.2.5',
    date: 'Dec 19, 2024',
    title: 'KYC Tracker Integration into CRM',
    category: 'updates',
    description: 'Fully Secured KYC Tracker in Our CRM',
    icon: Globe,
    tags: ['KYC-Tracker', 'kyc', 'Updates'],
    content: `
      <h2>Overview</h2>
      <p>Now you can search any number or client code into our kyc tracker and get all the details of the client</p>
    `,
    media: {
      type: 'video',
      url: 'https://crm.gopocket.in/files/22.12.2025_12.22.07_REC.mp4',
      caption: 'KYC Tracker Interface'
    },
    sections: [
      {
        content: `
          <h3>Key Capabilities</h3>
          <ul>
            <li><strong>Global Search:</strong> Search any number or client code.</li>
            <li><strong>Instant Details:</strong> Get all the details of the client instantly.</li>
          </ul>

          <div class="p-4 bg-blue-50 border-l-4 border-blue-500 my-4 text-blue-700">
            <strong>Next Update:</strong> feeling Lazy to copy paste the number we heard you
          </div>
        `,
        media: {
          type: 'video',
          url: 'https://crm.gopocket.in/files/22.12.2025_12.23.27_REC.mp4',
          caption: 'WhatsApp messaging interface (Placeholding for another content)'
        }
      },
      {
        content: `
          <h3>Additional Features</h3>
          <p>We've added more ways to visualize client data and track KYC progression in real-time.</p>
        `,
        media: {
          type: 'image',
          url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2426&auto=format&fit=crop',
          caption: 'Data Visualization Preview'
        }
      }
    ]
  },
  {
    id: 'notification-overhaul',
    version: 'v1.2.0',
    date: 'Dec 17, 2024',
    title: 'Notification System Overhaul',
    category: 'updates',
    description: 'Real-time alerts and improved notification management.',
    icon: Bell,
    tags: ['notifications', 'alerts', 'real-time'],
    content: `
      <h2>Stay Updated Instantly</h2>
      <p>We've completely rebuilt the notification engine to ensure you never miss a lead assignment or a task deadline.</p>
      
      <h3>New Features</h3>
      <ul>
        <li><strong>System Toast Alerts:</strong> Get Windows/macOS native notifications.</li>
        <li><strong>Sound Indicators:</strong> Distinct audio cues for new events.</li>
        <li><strong>Exact Counts:</strong> No more "99+" - see exactly how many pending items you have.</li>
      </ul>
    `
  },
  {
    id: 'lead-assignment-policy',
    title: 'Lead Assignment Policy',
    category: 'policies',
    description: 'Guidelines on how leads are distributed within the team.',
    icon: FileText,
    tags: ['policy', 'leads', 'distribution'],
    content: `
      <h2>Standard Operating Procedure</h2>
      <p>Leads are assigned based on geography, product interest, and current capacity of the Relationship Managers.</p>
      
      <h3>Assignment Rules</h3>
      <ol>
        <li><strong>Meta Leads:</strong> you will get 45 days to convert the lead if not converted the lead will be taken from you</li>
        <li><strong>Ownership:</strong> Callback, RNR, switch off, status not changed to followup for more than 4 days and no activity is present the lead will be taken from you</li>
        <li><strong>Assignments:</strong> if existing clints came as meta leads Active inactive status will be calculated if active that lead is assigned to branch manager if inactive the branch that running the ad will get the lead</li>
        <li><strong>Active Client:</strong> clients last traded date is <strong>within 90 days</strong></li>
        <li><strong>Inactive Client:</strong> clients last traded date is <strong>more than 90 days</strong></li>
      </ol>
    `
  },
  {
    id: 'security-guidelines',
    title: 'Data Security Guidelines',
    category: 'guidelines',
    description: 'Best practices for keeping client data safe and secure.',
    icon: ShieldCheck,
    tags: ['security', 'guidelines', 'data'],
    content: `
      <h2>Your Responsibility</h2>
      <p>Protecting client data is our top priority. Please follow these mandatory security steps.</p>
      
      <h3>Best Practices</h3>
      <ul>
        <li><strong>Password Safety:</strong> Use long, unique passwords and never share your credentials.</li>
        <li><strong>Public Access:</strong> Avoid accessing the CRM from public WiFi or shared computers.</li>
        <li><strong>Session Handling:</strong> Always log out if you are stepping away from your desk.</li>
      </ul>
    `
  },
  {
    id: 'mobile-crm-features',
    title: 'Mobile CRM Features',
    category: 'features',
    description: 'Everything you can do on your phone via the GoPocket PWA.',
    icon: Smartphone,
    tags: ['mobile', 'pwa', 'features'],
    content: `
      <h2>CRM on the Go</h2>
      <p>Access 90% of desktop features while you're in the field.</p>
      
      <h3>Optimized for Mobile</h3>
      <ul>
        <li>One-touch calling directly from the app.</li>
        <li>Location tagging for client meetings.</li>
        <li>Offline access for recently viewed leads.</li>
      </ul>
    `
  }
];
