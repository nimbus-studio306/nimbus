# Concept 08: Development & Build Server

## Role in Fleet
iOS/macOS app building, CI/CD, code compilation, development environment hosting.

## Hardware Target
Mac Studio M1 Max (32GB) - essential for Apple platform development

## Core Capabilities
- **iOS/macOS builds**: Xcode compilation (macOS required)
- **CI/CD runner**: GitHub Actions, GitLab, Jenkins
- **Container builds**: Docker for ARM, OrbStack
- **Code hosting**: Self-hosted Git, code review
- **Development VMs**: Parallels/UTM for testing
- **Remote development**: VS Code Server, JetBrains Gateway

## Why Mac for Development?
- **Apple platforms**: iOS/macOS development REQUIRES macOS
- **ARM native**: Build for Apple Silicon directly
- **Universal binaries**: Create both ARM + Intel
- **Xcode**: Cannot run elsewhere

## Key Software Stack

### Build Tools
- **Xcode** (Apple platforms)
- **Xcode Command Line Tools**
- **fastlane** (iOS automation)
- **CocoaPods/SPM** (dependency management)

### CI/CD
- **GitHub Actions Runner** (self-hosted)
- **GitLab Runner**
- **Jenkins** (with Mac agent)
- **Buildkite**

### Containers
- **OrbStack** (Docker alternative, excellent on Mac)
- **Docker Desktop** (heavier but complete)
- **Colima** (lightweight Docker)
- **Podman** (daemonless containers)

### Remote Development
- **VS Code Server** (code-server)
- **JetBrains Gateway**
- **Tailscale** (secure remote access)

### Virtualization
- **Parallels** (best performance)
- **UTM** (free, QEMU-based)
- **Tart** (macOS VMs for CI)

## Rental Model Potential
- **iOS build minutes**: €0.05-0.15/minute
- **Dedicated CI runner**: €300-600/month
- **App Store submission service**: €50-200/submission
- **Development environment**: €100-300/month per seat
- **macOS VM for testing**: €50-100/month

## GitHub Actions Self-Hosted Runner
```bash
# Download runner
mkdir actions-runner && cd actions-runner
curl -o actions-runner-osx-arm64.tar.gz -L \
  https://github.com/actions/runner/releases/download/v2.x.x/actions-runner-osx-arm64-2.x.x.tar.gz
tar xzf actions-runner-osx-arm64.tar.gz

# Configure (get token from GitHub repo settings)
./config.sh --url https://github.com/org/repo --token TOKEN

# Install as service
./svc.sh install
./svc.sh start
```

## fastlane Setup
```bash
# Install fastlane
brew install fastlane

# Initialize in project
cd ios-project
fastlane init

# Build and deploy
fastlane ios release
```

## Multi-Project Support
A single Mac Studio can serve multiple teams:
- Separate user accounts per project
- Resource limits via launchd
- Shared Xcode installations
- Isolated build directories

## Security Considerations
- **Keychain access**: Signing certificates need protection
- **SSH keys**: Use separate deploy keys
- **Secrets**: Use environment variables, not files
- **Network**: VPN/Tailscale for access
