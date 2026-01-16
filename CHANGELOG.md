# Changelog

All notable changes to TL;DR Busy Brief will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Integration tests for MCP server functionality
- Performance metrics and monitoring system
- Request tracking and success rate monitoring
- Response time metrics in health endpoint
- Performance headers (X-Response-Time, X-Request-ID)

### Improved
- Enhanced health endpoint with detailed metrics
- Better error tracking and categorization
- Exportable app instance for testing

## [0.1.0] - 2026-01-15

### Added
- Initial release of TL;DR Busy Brief
- Text summarization using OpenAI API
- Structured JSON output with summary, actions, and background
- Action details extraction with people and dates
- MCP (Model Context Protocol) server implementation
- Express.js REST API server
- Comprehensive input validation
- Error handling with retry logic
- Privacy-focused design (no data storage)
- MIT License
- Comprehensive documentation
- Environment configuration support

### Features
- **busy_brief tool**: Converts long text into structured briefs
- **Key extraction**: Summarizes main points (1-3 items)
- **Action items**: Identifies explicit tasks and deadlines
- **Background context**: Separates non-essential information
- **Tone detection**: Optional urgency level classification
- **People/date association**: Links actions to specific people and dates when mentioned
- **JSON output**: Machine-readable structured responses
- **Health endpoint**: Server status and configuration monitoring
- **Rate limiting**: Built-in retry logic for API failures
- **Timeout protection**: Configurable request timeouts

### Security & Privacy
- No user data storage
- Minimal operational logging
- OpenAI API integration only
- Clear privacy policy
- Revocable access through API key rotation

### Configuration
- Environment-based configuration
- Support for multiple OpenAI models
- Configurable timeouts and retry limits
- Docker-friendly setup
- Development and production environments

---

## Versioning Strategy

- **Major version (X.0.0)**: Breaking changes, significant new features
- **Minor version (X.Y.0)**: New features, improvements, non-breaking changes
- **Patch version (X.Y.Z)**: Bug fixes, security updates, documentation

### Release Types

#### Stable Releases
- Fully tested and validated
- Production-ready
- Complete documentation

#### Beta Releases
- New features in testing
- May contain bugs
- Subject to change

#### Hotfix Releases
- Critical security fixes
- Production issues
- Minimal changes

---

## Migration Guide

### From 0.1.0 to 0.2.0 (Future)
No breaking changes expected. Existing integrations will continue to work.

### Environment Variables
New environment variables may be added in future versions:
- `METRICS_ENABLED`: Enable/disable performance tracking
- `LOG_LEVEL`: Configure logging verbosity
- `RATE_LIMIT_ENABLED`: Enable rate limiting

### API Changes
The MCP schema remains stable. New optional fields may be added to responses without breaking existing clients.

---

## Support

For questions about specific versions or migration assistance:
- GitHub Issues: [https://github.com/iakogwu/tldr-busy-brief/issues](https://github.com/iakogwu/tldr-busy-brief/issues)
- Documentation: [README.md](README.md)
- Privacy Policy: [PRIVACY.md](PRIVACY.md)
