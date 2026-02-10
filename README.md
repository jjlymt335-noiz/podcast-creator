# Podcast Creator

Transform your documents into engaging audio podcasts with AI-powered voices.

## Features

- 📄 **Multi-format Document Support**: PDF, EPUB, DOCX, TXT, HTML
- 🤖 **Auto-assign Voices (Alpha)**: AI-powered speaker identification and voice matching
- 🎙️ **Voice Library**: Access to public and custom voice collections
- 🎨 **Voice Design**: Generate custom voices from text descriptions
- ✏️ **Script Editor**: Edit text and assign voices to each speaker
- 🎵 **TTS Generation**: High-quality text-to-speech synthesis
- 💾 **Project Management**: Save and load projects locally

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **UI**: Tailwind CSS + shadcn/ui
- **State Management**: Zustand
- **Document Parsing**: PDF.js, epub.js, mammoth.js
- **API**: Speech Service API

## Getting Started

### Prerequisites

- Node.js 16+ and npm

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd podcast-creator
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
```

Edit `.env` and set your API base URL:
```
VITE_API_BASE_URL=https://your-api-server.com
```

### Development

Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Build

Build for production:
```bash
npm run build
```

Preview production build:
```bash
npm run preview
```

## Project Structure

```
podcast-creator/
├── src/
│   ├── components/          # React components
│   │   ├── EntryPage/       # Entry page (upload/select)
│   │   ├── EditorPage/      # Editor page (edit/generate)
│   │   └── ui/              # Reusable UI components
│   ├── lib/
│   │   ├── api/             # API client and wrappers
│   │   ├── parsers/         # Document parsers
│   │   └── utils.ts         # Utility functions
│   ├── store/               # Zustand state management
│   │   ├── project-store.ts # Project state
│   │   ├── voice-store.ts   # Voice library state
│   │   └── ui-store.ts      # UI state
│   ├── types/               # TypeScript types
│   │   ├── api.ts           # API types
│   │   └── project.ts       # Project types
│   ├── App.tsx              # Main app component
│   ├── main.tsx             # Entry point
│   └── index.css            # Global styles
├── public/                  # Static assets
├── backend-api-spec.md      # Backend API specification
└── package.json
```

## Usage

### 1. Upload a Document

- Drag and drop a document (PDF, EPUB, DOCX, TXT, HTML)
- Or click "Choose File" to browse

### 2. Auto-assign Voices (Optional)

- Toggle "Auto-assign voices" to enable AI-powered speaker identification
- This feature uses Mock data by default
- To enable real API: Edit `src/lib/api/auto-assign.ts` and set `USE_MOCK = false`

### 3. Edit Script

- Review and edit the generated script
- Assign voices to each speaker
- Use Smart Emotion for enhanced emotional expression

### 4. Generate Audio

- Click "Generate" to create the podcast audio
- Monitor progress in the UI
- Download or share the final audio

## Backend API

The frontend communicates with a Speech Service API. See `backend-api-spec.md` for detailed API documentation.

### Required Endpoints

- ✅ TTS (short, long, extra-long)
- ✅ Voice Library
- ✅ Voice Design
- ✅ Smart Emotion
- ⏳ Auto-assign Voices (needs backend implementation)

### Mock Mode

By default, the auto-assign feature uses mock data for demonstration. To connect to a real backend API:

1. Implement the auto-assign API as specified in `backend-api-spec.md`
2. Update `src/lib/api/auto-assign.ts`:
   ```typescript
   const USE_MOCK = false; // Change to false
   ```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Backend API base URL | `http://localhost:8000` |

## Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## License

[Your License Here]

## Support

For issues and questions, please open an issue on GitHub.
