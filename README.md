# ConversAI

<div align="center">

![ConversAI Logo](https://img.shields.io/badge/ConversAI-Intelligent%20Chat%20Companion-blue?style=for-the-badge&logo=chat)

**Your intelligent conversation companion powered by AI**

[![Next.js](https://img.shields.io/badge/Next.js-15.3.0-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18-blue?style=flat-square&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3.4.17-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

</div>

## 🌟 Features

### 🤖 **AI-Powered Conversations**
- **Real-time streaming responses** from Google's Gemini 2.0 Flash model
- **Context-aware conversations** with memory retention
- **Multi-modal support** for text and file attachments
- **Smart conversation management** with chat history

### 💬 **Rich Chat Experience**
- **Message editing** - Edit your previous messages and regenerate responses
- **File attachments** - Upload images, PDFs, and documents for analysis
- **Copy to clipboard** - Easy sharing of conversations
- **Message regeneration** - Regenerate assistant responses when needed
- **Real-time typing indicators** - See when AI is responding

### 🎨 **Modern UI/UX**
- **Responsive design** - Works seamlessly on desktop and mobile
- **Dark/Light theme** - Toggle between themes with system preference support
- **Collapsible sidebar** - Clean, distraction-free interface
- **Search functionality** - Find conversations quickly with smart categorization
- **Accessibility compliant** - Full ARIA support for screen readers

### 🔐 **Authentication & Security**
- **Clerk authentication** - Secure user management
- **User-specific data** - Each user has isolated chat history
- **Protected API routes** - Secure backend communication
- **Memory management** - Personal conversation memory with Mem0AI

### 📱 **Mobile Optimized**
- **Touch-friendly interface** - Optimized for mobile devices
- **Full-screen search** - Mobile-first search experience
- **Responsive navigation** - Adaptive sidebar for mobile
- **Gesture support** - Intuitive mobile interactions

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm, yarn, pnpm, or bun
- MongoDB database
- Google AI API key
- Clerk authentication setup

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/conversai.git
   cd conversai/frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the `frontend` directory:
   ```env
   # Database
   MONGODB_URI=your_mongodb_connection_string
   
   # AI Services
   GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_key
   MEM0_API_KEY=your_mem0ai_key
   
   # Authentication
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
   CLERK_SECRET_KEY=your_clerk_secret_key
   
   # Optional: File Upload
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   ```

4. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🏗️ Project Structure

```
conversai/
├── frontend/                 # Next.js application
│   ├── app/                 # App router pages
│   │   ├── api/            # API routes
│   │   │   ├── chat/       # Chat API endpoints
│   │   │   ├── memories/   # Memory management
│   │   │   └── upload/     # File upload handling
│   │   ├── globals.css     # Global styles
│   │   ├── layout.tsx      # Root layout
│   │   └── page.tsx        # Main page
│   ├── components/         # React components
│   │   ├── ui/            # Reusable UI components
│   │   ├── chat-interface.tsx
│   │   ├── sidebar.tsx
│   │   ├── settings-modal.tsx
│   │   ├── search-modal.tsx
│   │   └── file-upload.tsx
│   ├── contexts/          # React contexts
│   ├── hooks/             # Custom hooks
│   ├── lib/               # Utility functions
│   └── middleware.ts      # Clerk middleware
├── LICENSE
└── README.md
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGODB_URI` | MongoDB connection string | ✅ |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Google AI API key | ✅ |
| `MEM0_API_KEY` | Mem0AI API key for memory | ✅ |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key | ✅ |
| `CLERK_SECRET_KEY` | Clerk secret key | ✅ |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | ❌ |
| `CLOUDINARY_API_KEY` | Cloudinary API key | ❌ |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | ❌ |

### API Setup

1. **Google AI**: Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. **Mem0AI**: Sign up at [Mem0AI](https://mem0.ai) for conversation memory
3. **Clerk**: Create an account at [Clerk](https://clerk.com) for authentication
4. **MongoDB**: Set up a MongoDB database (Atlas recommended)

## 📖 Usage

### Getting Started

1. **Sign In**: Click "Sign In to Start Chatting" to authenticate
2. **Start Chatting**: Type your message and press Enter or click the send button
3. **Attach Files**: Click the "+" button to upload images or documents
4. **Manage Chats**: Use the sidebar to navigate between conversations
5. **Search**: Use the search function to find specific conversations

### Features

- **Edit Messages**: Hover over your messages to see edit and copy options
- **Regenerate Responses**: Click the refresh icon to regenerate AI responses
- **Theme Toggle**: Access settings to switch between light and dark themes
- **Memory Management**: View and manage your conversation memories

## 🛠️ Development

### Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

### Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **Styling**: Tailwind CSS, Radix UI components
- **Authentication**: Clerk
- **Database**: MongoDB
- **AI**: Google Gemini 2.0 Flash, Mem0AI
- **File Upload**: Cloudinary (optional)
- **Deployment**: Vercel (recommended)

### Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically on push

### Other Platforms

The app can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- DigitalOcean App Platform
- AWS Amplify

## 🔒 Security

- **Authentication**: Clerk handles secure user authentication
- **API Protection**: All API routes are protected by middleware
- **Data Isolation**: User data is isolated by user ID
- **Environment Variables**: Sensitive data is stored in environment variables

## 📱 Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 🤝 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/conversai/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/conversai/discussions)
- **Email**: your-email@example.com

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - React framework
- [Clerk](https://clerk.com/) - Authentication
- [Google AI](https://ai.google/) - AI models
- [Mem0AI](https://mem0.ai/) - Conversation memory
- [Radix UI](https://www.radix-ui.com/) - UI components
- [Tailwind CSS](https://tailwindcss.com/) - Styling

---

<div align="center">

**Made with ❤️ by [Kshitij Thareja](https://github.com/yourusername)**

[![GitHub](https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white)](https://github.com/yourusername)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://linkedin.com/in/yourusername)
[![Twitter](https://img.shields.io/badge/Twitter-1DA1F2?style=for-the-badge&logo=twitter&logoColor=white)](https://twitter.com/yourusername)

</div>