# GitHub Pages Website Setup and Publishing Guide

## Overview

This guide provides complete instructions for setting up and publishing the Arrow Flight Server Node.js documentation website using GitHub Pages with Jekyll.

## Prerequisites

- GitHub account with repository access
- Git installed locally
- Ruby installed (for local development)
- Basic familiarity with Git and GitHub

## Repository Structure

The website files are organized in the `/docs` directory:

```
docs/
├── _config.yml          # Jekyll configuration
├── Gemfile             # Ruby dependencies
├── index.md            # Homepage
├── getting-started.md  # Installation guide
├── tutorial.md         # Step-by-step tutorial
├── examples.md         # Real-world examples
├── api-reference.md    # API documentation
└── contributing.md     # Contributor guidelines
```

## GitHub Pages Setup

### 1. Enable GitHub Pages

1. **Navigate to Repository Settings**:
   - Go to your GitHub repository
   - Click on the "Settings" tab

2. **Configure Pages Settings**:
   - Scroll down to "Pages" in the left sidebar
   - Under "Source", select "Deploy from a branch"
   - Choose "main" branch
   - Select "/docs" folder
   - Click "Save"

3. **Verify Setup**:
   - GitHub will show a green checkmark when ready
   - Your site will be available at: `https://[username].github.io/[repository-name]/`
   - For this project: `https://ggauravr.github.io/arrow-flight-node/`

### 2. Initial Deployment

After enabling GitHub Pages:

1. **Commit and Push** (if not already done):
   ```bash
   git add docs/
   git commit -m "Add GitHub Pages documentation site"
   git push origin main
   ```

2. **Wait for Build**:
   - GitHub automatically builds the site using Jekyll
   - Check the "Actions" tab to monitor build progress
   - First build typically takes 2-5 minutes

3. **Access Your Site**:
   - Visit your GitHub Pages URL
   - It may take a few minutes to become available

## Local Development Setup

For local testing and development:

### 1. Install Ruby and Bundler

**On macOS** (using Homebrew):
```bash
brew install ruby
gem install bundler
```

**On Ubuntu/Debian**:
```bash
sudo apt-get install ruby-full build-essential zlib1g-dev
gem install bundler
```

**On Windows**:
- Download and install Ruby from [rubyinstaller.org](https://rubyinstaller.org/)
- Install bundler: `gem install bundler`

### 2. Install Dependencies

Navigate to the docs directory and install Jekyll:

```bash
cd docs
bundle install
```

### 3. Run Local Server

Start the local development server:

```bash
bundle exec jekyll serve
```

The site will be available at: `http://localhost:4000`

**Development Benefits**:
- Live reload on file changes
- Faster iteration than GitHub builds
- Error debugging
- Preview before publishing

## Customization Options

### 1. Theme Customization

The site uses the default Jekyll theme. To customize:

**Custom CSS** - Add to `_config.yml`:
```yaml
plugins:
  - jekyll-default-layout

sass:
  style: compressed
```

Create `assets/css/style.scss`:
```scss
@import "{{ site.theme }}";

/* Custom styles */
.hero-section {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 4rem 0;
}
```

**Custom Layouts** - Create `_layouts/` directory:
```markdown
_layouts/
├── default.html
├── page.html
└── post.html
```

### 2. Navigation Customization

Add to `_config.yml`:
```yaml
header_pages:
  - getting-started.md
  - tutorial.md
  - examples.md
  - api-reference.md
  - contributing.md
```

### 3. SEO and Analytics

**Google Analytics** - Add to `_config.yml`:
```yaml
google_analytics: YOUR_TRACKING_ID
```

**SEO Plugin** - Add to `_config.yml`:
```yaml
plugins:
  - jekyll-seo-tag

title: Arrow Flight Server Node.js
description: High-performance Arrow Flight server framework for Node.js
url: https://ggauravr.github.io
baseurl: /arrow-flight-node
```

## Domain Configuration (Optional)

### 1. Custom Domain Setup

If you want to use a custom domain (e.g., `docs.yourproject.com`):

1. **Create CNAME file**:
   ```bash
   echo "docs.yourproject.com" > docs/CNAME
   ```

2. **Configure DNS**:
   - Add CNAME record pointing to `[username].github.io`
   - Or A records pointing to GitHub Pages IPs:
     - `185.199.108.153`
     - `185.199.109.153`
     - `185.199.110.153`
     - `185.199.111.153`

3. **Update Repository Settings**:
   - Go to Pages settings
   - Enter your custom domain
   - Enable "Enforce HTTPS"

## Content Management

### 1. Adding New Pages

Create new `.md` files in `/docs`:

```markdown
---
layout: page
title: New Page Title
permalink: /new-page/
---

# New Page Content

Your content here...
```

### 2. Updating Navigation

Edit `_config.yml` to include new pages:

```yaml
header_pages:
  - getting-started.md
  - tutorial.md
  - new-page.md  # Add your new page
  - examples.md
  - api-reference.md
  - contributing.md
```

### 3. Content Guidelines

**Front Matter**:
- Always include YAML front matter at the top
- Use consistent layout names
- Set appropriate titles and permalinks

**Markdown Best Practices**:
- Use proper heading hierarchy (H1 → H2 → H3)
- Include code syntax highlighting
- Add links to related sections
- Use relative links for internal pages

## Deployment Workflow

### 1. Development Process

```bash
# 1. Create feature branch
git checkout -b update-docs

# 2. Make changes locally
# Edit files in docs/

# 3. Test locally
cd docs
bundle exec jekyll serve

# 4. Commit changes
git add docs/
git commit -m "Update documentation"

# 5. Push and create PR
git push origin update-docs
# Create Pull Request on GitHub
```

### 2. Production Deployment

```bash
# After PR is merged to main
git checkout main
git pull origin main

# GitHub Pages automatically rebuilds
# Check Actions tab for build status
```

### 3. Build Monitoring

Monitor deployments:
- **Actions Tab**: View build logs and status
- **Environments**: See deployment history
- **Settings > Pages**: Check configuration and build status

## Troubleshooting

### Common Issues

**1. Build Failures**:
- Check Actions tab for error logs
- Verify `_config.yml` syntax
- Ensure all required front matter is present
- Check for broken internal links

**2. Site Not Updating**:
- Verify changes were pushed to main branch
- Check if build completed successfully
- Clear browser cache
- Wait 5-10 minutes for propagation

**3. Local Development Issues**:
- Update Ruby and bundler: `gem update --system`
- Reinstall dependencies: `bundle install`
- Check Jekyll version: `bundle exec jekyll --version`

**4. Styling Issues**:
- Verify CSS syntax in custom stylesheets
- Check browser developer tools for errors
- Ensure SCSS compilation is working

### Debug Commands

```bash
# Check Jekyll version
bundle exec jekyll --version

# Build with verbose output
bundle exec jekyll build --verbose

# Check site configuration
bundle exec jekyll doctor

# Clean build files
bundle exec jekyll clean
```

## Maintenance

### 1. Regular Updates

**Monthly Tasks**:
- Update gem dependencies: `bundle update`
- Review and update documentation content
- Check for broken links
- Monitor site performance

**Security Updates**:
- Keep Jekyll and plugins updated
- Monitor GitHub security advisories
- Update Ruby version as needed

### 2. Content Auditing

**Quarterly Review**:
- Verify all code examples work with latest version
- Update API documentation for new features
- Review and update getting started guide
- Check external links for validity

**Performance Monitoring**:
- Use Google PageSpeed Insights
- Monitor Core Web Vitals
- Optimize images and assets
- Review mobile responsiveness

## Advanced Features

### 1. Search Functionality

Add search with Lunr.js:

```yaml
# _config.yml
plugins:
  - jekyll-lunr-js-search
```

### 2. Multiple Languages

Set up internationalization:

```yaml
# _config.yml
plugins:
  - jekyll-multiple-languages-plugin

languages: ["en", "es", "fr"]
```

### 3. API Documentation

Generate API docs from code:

```yaml
# _config.yml
plugins:
  - jekyll-jsdoc
```

## Support and Resources

### Documentation
- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [Jekyll Documentation](https://jekyllrb.com/docs/)
- [Jekyll Themes](https://jekyllrb.com/docs/themes/)

### Community
- [Jekyll Talk Forum](https://talk.jekyllrb.com/)
- [GitHub Community](https://github.community/)
- [Stack Overflow Jekyll Tag](https://stackoverflow.com/questions/tagged/jekyll)

### Tools
- [Jekyll Theme Previewer](https://jekyllthemes.org/)
- [Markdown Editor](https://typora.io/)
- [GitHub Desktop](https://desktop.github.com/)

---

## Quick Start Checklist

- [ ] Enable GitHub Pages in repository settings
- [ ] Verify `/docs` folder is selected as source
- [ ] Wait for initial build to complete
- [ ] Visit your GitHub Pages URL
- [ ] Set up local development environment
- [ ] Test local Jekyll server
- [ ] Customize theme and styling
- [ ] Configure custom domain (optional)
- [ ] Set up content management workflow
- [ ] Monitor first deployment
- [ ] Document any custom setup steps

Your Arrow Flight Server Node.js documentation site is now live and ready for the world to discover! 