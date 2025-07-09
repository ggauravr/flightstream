# Development Guide: Local vs Remote Core Server

This guide explains how to switch between using a local version of the core server package versus a published remote version.

## Quick Start

```bash
# Use local development version
npm run link:local

# Use published remote version  
npm run link:remote

# Check which version is currently being used
npm run check:proto
```

## How It Works

The flight client automatically resolves the proto file location using this priority:

1. **Package Resolution**: First tries to find `@flightstream/core-server` in `node_modules`
2. **Local Fallback**: Falls back to the local monorepo path if package not found

## Detailed Usage

### 1. Using Local Development Version

When developing or testing changes to the core server:

```bash
# Link to local core server package
npm run link:local

# This creates a symlink: node_modules/@flightstream/core-server -> ../../../core/server
```

**Benefits:**
- Changes to core server are immediately reflected
- No need to publish/install for testing
- Faster development iteration

### 2. Using Published Remote Version

When using a stable, published version:

```bash
# Install from npm registry
npm run link:remote

# This removes the symlink and installs the actual package
```

**Benefits:**
- Uses stable, tested version
- Matches production environment
- Isolated from local changes

## Troubleshooting

### Check Current Configuration

```bash
# See which proto file is being used
npm run check:proto

# Check if core server is linked
ls -la node_modules/@flightstream/core-server

# If it shows "-> ../../../core/server", it's using local version
# If it shows normal directory, it's using remote version
```

### Common Issues

1. **Proto file not found**
   ```bash
   # Make sure core server package exists
   ls -la ../../../core/server/package.json
   
   # Or install remote version
   npm run link:remote
   ```

2. **Symlink not working**
   ```bash
   # Remove existing link and recreate
   npm unlink @flightstream/core-server
   npm run link:local
   ```

3. **Version conflicts**
   ```bash
   # Clean and reinstall
   rm -rf node_modules
   npm install
   npm run link:local  # or link:remote
   ```

## Development Workflow

### For Core Server Development

```bash
# 1. Link to local version
npm run link:local

# 2. Make changes to core server
# Edit files in ../../../core/server/

# 3. Test changes
npm run example:simple

# 4. When ready, publish core server and switch to remote
npm run link:remote
```

### For Gateway Development

```bash
# 1. Use stable remote version
npm run link:remote

# 2. Make changes to gateway
# Edit files in src/

# 3. Test with stable core server
npm run example:simple
```

## Environment Variables

You can also override the proto path with an environment variable:

```bash
FLIGHT_PROTO_PATH=/path/to/custom/flight.proto npm run example:simple
```

## Verification

After switching, you can verify the setup:

```bash
# Check the proto path being used
npm run check:proto

# Start an example to see the log output
npm run example:simple
# Look for: "Using proto from package: ..." or "Using proto from local monorepo: ..."
``` 