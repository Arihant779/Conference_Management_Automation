# ConfManager - Conference Management Platform

A modern, dark-themed React application for managing academic conferences with role-based dashboards.

## 🌟 Features

### Authentication
- User login and registration
- Secure authentication system
- Demo accounts for testing

### Conference Management
- Create and manage conferences
- Multiple template options (Modern, Classic, Minimal)
- Beautiful conference homepages
- Customizable branding

### Role-Based Dashboards

#### Organizer Dashboard
- Event overview with statistics
- Paper submission management
- Accept/reject papers
- Task management system
- Team collaboration tools

#### Presenter Dashboard
- Submit research papers
- Track submission status
- View acceptance/rejection status
- Session scheduling information

#### Reviewer Dashboard
- Review pending papers
- Provide feedback
- Accept/reject submissions
- Track review progress

## 🎨 Design Features

- **Modern Dark Theme**: Sleek, professional dark UI with indigo/purple accents
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **Smooth Animations**: Polished transitions and micro-interactions
- **Glassmorphism Effects**: Modern backdrop blur and transparency
- **Component-Based Architecture**: Clean, modular code structure

## 📁 Project Structure

```
conference-platform/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── Auth/
│   │   │   └── AuthModule.jsx
│   │   ├── Conference/
│   │   │   ├── ConferenceView.jsx
│   │   │   ├── CreateConference.jsx
│   │   │   └── Templates/
│   │   │       ├── ModernTemplate.jsx
│   │   │       └── ClassicTemplate.jsx
│   │   └── Dashboard/
│   │       ├── UserDashboard.jsx
│   │       ├── OrganizerDashboard.jsx
│   │       ├── PresenterDashboard.jsx
│   │       ├── ReviewerDashboard.jsx
│   │       └── RoleBasedDashboard.jsx
│   ├── context/
│   │   └── AppContext.jsx
│   ├── App.jsx
│   ├── index.js
│   └── index.css
├── package.json
└── tailwind.config.js
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Navigate to the project directory:
```bash
cd conference-platform
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## 🔐 Demo Accounts

Use these credentials to test different roles:

- **Organizer**: alice@test.com / 123
- **Reviewer**: bob@test.com / 123
- **Presenter**: charlie@test.com / 123

## 🛠️ Built With

- **React** - UI library
- **Tailwind CSS** - Styling framework
- **Lucide React** - Icon library
- **Context API** - State management

## 📦 Key Components

### AppContext
Global state management for:
- User authentication
- Conference data
- Paper submissions
- Task management

### AuthModule
- Login/Register forms
- Form validation
- Session management

### CreateConference
- Multi-step form
- Template selection
- Conference configuration

### UserDashboard
- Conference listing
- Tabbed navigation
- Search functionality

### RoleBasedDashboard
- Dynamic dashboard routing
- Role-specific features
- Real-time updates

## 🎨 Color Palette

- **Primary Background**: `#020617` (Deep Navy)
- **Secondary Background**: `#0f1117` (Charcoal)
- **Accent**: Indigo `#6366f1` / Purple `#a855f7`
- **Text**: Slate variations
- **Success**: Emerald `#10b981`
- **Warning**: Amber `#f59e0b`
- **Error**: Red `#ef4444`

## 📱 Responsive Breakpoints

- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

## 🔄 State Management

The app uses React Context API for global state:
- User session
- Conference list
- Papers and submissions
- Tasks and assignments

## 🎯 Future Enhancements

- [ ] Real-time notifications
- [ ] File upload functionality
- [ ] Advanced search and filters
- [ ] Email integration
- [ ] Calendar integration
- [ ] Multi-language support
- [ ] Dark/Light theme toggle
- [ ] Export functionality

## 📄 License

This project is open source and available under the MIT License.

## 👥 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Contact

For questions or support, please open an issue in the repository.
