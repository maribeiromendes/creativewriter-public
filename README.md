# CreativeWriter 2

> **🔗 Self-Hosters: Looking for the public version? Visit [creativewriter2-public](https://github.com/MarcoDroll/creativewriter2-public) for easy deployment!**

A powerful, AI-enhanced creative writing application that helps authors craft compelling stories with intelligent assistance for plot development, character creation, and narrative structure.

![Angular](https://img.shields.io/badge/Angular-20-red)
![Ionic](https://img.shields.io/badge/Ionic-8-blue)
![Docker](https://img.shields.io/badge/Docker-Ready-brightgreen)
![License](https://img.shields.io/badge/License-MIT-yellow)

## 🎯 What is CreativeWriter?

CreativeWriter is a modern web-based writing tool designed for fiction authors who want to leverage AI technology to enhance their creative process. It combines traditional story structuring techniques with cutting-edge AI capabilities to help writers overcome creative blocks, develop rich narratives, and maintain consistency throughout their work.

## ✨ Features

### 📝 Story Management
- **Multi-Story Support**: Manage multiple writing projects simultaneously
- **Rich Text Editor**: Full-featured ProseMirror-based editor with formatting tools
- **Story Structure**: Organize your narrative with acts, chapters, scenes, and beats
- **Auto-Save**: Never lose your work with automatic saving to local database

### 🤖 AI Integration
- **Multiple AI Providers**: Support for OpenRouter, Google Gemini, and other LLMs
- **Beat AI Assistant**: Get intelligent suggestions for plot development
- **Scene Enhancement**: AI-powered scene expansion and refinement
- **Character Consistency**: Maintain character voice and traits with AI assistance
- **Custom Prompts**: Fine-tune AI behavior with customizable prompt templates

### 📚 Codex System
- **Dynamic Knowledge Base**: Automatically track characters, locations, and plot elements
- **Smart Context Awareness**: AI understands your story's universe
- **Relevance Scoring**: Intelligent filtering of relevant codex entries for each scene
- **Tag Management**: Organize codex entries with custom tags

### 🎨 Customization
- **Theme Support**: Dark and light modes
- **Custom Backgrounds**: Upload and manage custom backgrounds for your writing environment
- **Flexible Layouts**: Adjustable editor and panel configurations
- **Font Options**: Multiple font choices for comfortable reading and writing

### 🔄 Data Management
- **Local Database**: PouchDB/CouchDB for offline-first functionality
- **Import/Export**: Support for various formats including NovelCrafter projects
- **PDF Export**: Generate formatted PDFs of your stories
- **Version History**: Track changes and revisions

### 🖼️ Media Support
- **Image Generation**: Integration with Replicate for AI image generation
- **Image Management**: Upload and manage story-related images
- **Video Support**: Embed and manage video content

## 🏗️ Architecture

CreativeWriter is built with modern web technologies:

- **Frontend**: Angular 20 with Ionic 8 for responsive UI
- **Editor**: ProseMirror for rich text editing
- **Database**: PouchDB with CouchDB sync capability
- **AI Services**: Modular integration with multiple AI providers
- **Deployment**: Docker containers with nginx reverse proxy

## 🚀 Getting Started

### Quick Start with Docker (No Cloning Required!)

1. **Create a directory for your instance**
   ```bash
   mkdir creativewriter && cd creativewriter
   ```

2. **Download docker-compose.yml**
   ```bash
   curl -O https://raw.githubusercontent.com/MarcoDroll/creativewriter2/main/docker-compose.yml
   ```

3. **Start the application**
   ```bash
   docker compose up -d
   ```

4. **Access CreativeWriter**
   ```
   http://localhost:3080
   ```

5. **Configure your AI providers**
   - Open Settings in the app
   - Add your API keys for OpenRouter, Google Gemini, or Replicate
   - Start writing with AI assistance!

### Development Setup

For development or customization, clone the repository:

1. **Clone and setup**
   ```bash
   git clone https://github.com/MarcoDroll/creativewriter2.git
   cd creativewriter2
   ```

2. **Prerequisites**
   - Node.js 20+
   - npm 10+
   - Angular CLI 19+

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Start development server**
   ```bash
   npm start
   ```

5. **Build for production**
   ```bash
   npm run build
   ```

### Configuration

#### AI Providers
Configure your AI providers in the application settings:
- **OpenRouter**: Add your API key for access to multiple models
- **Google Gemini**: Direct integration with Gemini models
- **Custom Endpoints**: Support for self-hosted models

#### Database
The application uses PouchDB for local storage with optional CouchDB sync:
- Local-only mode works out of the box
- For sync, configure CouchDB connection in settings

## 🐳 Docker Deployment

### Prerequisites
- Docker and Docker Compose installed
- No need to clone the repository
- ~500MB-1GB RAM per instance
- Port 3080 available (or configure a different port)

### Single Instance
Simply download and run:
```bash
mkdir creativewriter && cd creativewriter
curl -O https://raw.githubusercontent.com/MarcoDroll/creativewriter2/main/docker-compose.yml
docker compose up -d
```
Then configure your AI API keys in Settings after accessing the app at http://localhost:3080.

### Multiple Instances
Run multiple isolated instances on the same host:

```bash
# Instance 1 - Personal Writing
mkdir writer-personal && cd writer-personal
curl -O https://raw.githubusercontent.com/MarcoDroll/creativewriter2/main/docker-compose.yml
echo "PORT=3080" > .env
docker compose -p writer-personal up -d

# Instance 2 - Work Projects (different directory)
mkdir ../writer-work && cd ../writer-work
curl -O https://raw.githubusercontent.com/MarcoDroll/creativewriter2/main/docker-compose.yml
echo "PORT=3081" > .env
docker compose -p writer-work up -d
```

Each instance maintains its own database and settings, so configure API keys separately in each instance's Settings.

See [README-MULTI-INSTANCE.md](README-MULTI-INSTANCE.md) for detailed multi-instance setup.

## 📦 Docker Images

Pre-built images available on GitHub Container Registry:
- `ghcr.io/marcodroll/creativewriter2:latest` - Main application
- `ghcr.io/marcodroll/creativewriter2-nginx:latest` - Nginx reverse proxy
- `ghcr.io/marcodroll/creativewriter2-proxy:latest` - Replicate API proxy
- `ghcr.io/marcodroll/creativewriter2-gemini-proxy:latest` - Gemini API proxy

## 🛠️ Development

### Project Structure
```
src/
├── app/
│   ├── core/        # Core services and models
│   ├── shared/      # Shared components and utilities
│   ├── stories/     # Story management module
│   └── settings/    # Settings module
├── assets/          # Static assets and templates
└── styles.scss      # Global styles
```

### Key Technologies
- **Angular 20**: Modern web framework
- **Ionic 8**: UI components and mobile support
- **ProseMirror**: Powerful text editor framework
- **PouchDB**: Local-first database
- **RxJS**: Reactive programming
- **TypeScript**: Type-safe development

## 📝 Usage Tips

1. **Start with Story Structure**: Define your acts and chapters before diving into scenes
2. **Build Your Codex**: Add characters and locations early for better AI context
3. **Use Beat AI**: Let AI help with writer's block on individual beats
4. **Customize Prompts**: Tailor AI responses to your writing style
5. **Regular Exports**: Backup your work regularly using export features

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Built with Angular and Ionic frameworks
- AI integrations powered by OpenRouter and Google Gemini
- ProseMirror for the editing experience
- Community contributors and testers

## 📚 Documentation

- [Multi-Instance Deployment](README-MULTI-INSTANCE.md)
- [Image Generation Setup](README-IMAGE-GENERATION.md)
- [API Documentation](docs/api.md)

## 🔗 Links

- [GitHub Repository](https://github.com/MarcoDroll/creativewriter2)
- [Issue Tracker](https://github.com/MarcoDroll/creativewriter2/issues)
- [Docker Images](https://github.com/MarcoDroll/creativewriter2/pkgs/container/creativewriter2)