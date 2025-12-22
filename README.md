# 🏆 Live Voting Application

A real-time voting application for office events with live results display. Perfect for award ceremonies, team building events, and interactive presentations.

## ✨ Features

- **Real-time Voting**: 30-second voting periods with live updates
- **No Sign-up Required**: Participants join instantly via unique links
- **Mobile Responsive**: Works perfectly on phones and tablets
- **Live Results**: See votes come in real-time on the admin screen
- **Admin Control**: Start/stop voting sessions and monitor participation
- **Scalable**: Handles 60+ participants simultaneously
- **Beautiful UI**: Modern, intuitive interface with smooth animations

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. **Clone and install dependencies:**

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

2. **Start the backend server:**

```bash
cd backend
npm run dev
```

The backend will run on `http://localhost:3001`

3. **Start the frontend (in a new terminal):**

```bash
npm run dev
```

The frontend will run on `http://localhost:3000`

## 📱 How to Use

### For Participants

1. Open the main page at `http://localhost:3000`
2. Click "Show QR Code" or "Open Voting Page"
3. Wait for the admin to start a voting session
4. Vote when the session begins (30 seconds)
5. Watch live results update in real-time

### For Admins

1. Open the admin panel at `http://localhost:3000/admin`
2. Share this screen on your projector
3. Select an award category to start voting
4. Control the 30-second voting period
5. View live results and announce winners

## 🏗️ Architecture

- **Frontend**: Next.js 14 with TypeScript and Tailwind CSS
- **Backend**: Node.js with Express and Socket.io
- **Database**: SQLite (lightweight and perfect for events)
- **Real-time**: WebSocket connections for instant updates
- **Icons**: Lucide React for consistent iconography

## 📊 Award Categories

The app comes with 5 pre-configured funny office award categories:

- Best Dad Joke
- Coffee Addict
- Meeting Master
- Tech Support Hero
- Lunch Explorer

You can easily customize these in the backend code.

## 🔧 Customization

### Adding New Categories

Edit `backend/server.js` and add to the `defaultCategories` array:

```javascript
const defaultCategories = [
  // ... existing categories
  {
    id: "new-category",
    title: "New Award",
    description: "Description here",
  },
];
```

### Changing Voting Options

Modify the `options` array in the voting session creation:

```javascript
options: ["Option 1", "Option 2", "Option 3", "Option 4"];
```

### Adjusting Timer

Change the 30000ms (30 seconds) value in the backend:

```javascript
endTime: Date.now() + 45000, // 45 seconds
```

## 🌐 Deployment

### Production Setup

1. Build the frontend: `npm run build`
2. Set environment variables for production URLs
3. Use a production database (PostgreSQL, MySQL)
4. Deploy backend to your server
5. Deploy frontend to Vercel/Netlify

### Environment Variables

```bash
# Backend
PORT=3001
NODE_ENV=production

# Frontend (if needed)
NEXT_PUBLIC_BACKEND_URL=https://your-backend.com
```

## 🐛 Troubleshooting

### Common Issues

- **Socket connection failed**: Ensure backend is running on port 3001
- **Database errors**: Check file permissions for SQLite database
- **CORS issues**: Backend is configured to allow all origins for development

### Performance Tips

- The app is optimized for 60+ concurrent users
- SQLite works well for event-scale usage
- Consider Redis for larger-scale deployments

## 📱 Mobile Optimization

- Touch-friendly voting buttons
- Responsive design for all screen sizes
- Optimized for portrait orientation
- Fast loading on mobile networks

## 🔒 Security Notes

- No authentication required (intended for office events)
- Participants get unique IDs automatically
- Votes are stored with participant tracking
- Consider adding rate limiting for production use

## 🤝 Contributing

Feel free to submit issues and enhancement requests!

## 📄 License

MIT License - feel free to use this for your events!
