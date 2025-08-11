# 🤖 Claude Code Subagents for CreativeWriter2

This directory contains specialized Claude Code subagent configurations that provide expert capabilities for specific domains within the CreativeWriter2 project.

## 🚀 Available Subagents

### CI/CD Specialist (`ci-cd-specialist`)

An expert CI/CD subagent specialized in release management, workflow optimization, and deployment automation for CreativeWriter2.

**Key Capabilities:**
- ✅ Automated release merge management
- 🔍 GitHub Actions workflow debugging  
- 🐳 Docker orchestration and optimization
- 🔒 Security scanning and compliance
- 📊 Performance monitoring and optimization
- 🚨 Emergency response and rollback procedures

---

## 🛠️ Usage Methods

### Method 1: Direct Task Tool Invocation

Use Claude Code's Task tool directly:

```javascript
Task({
  subagent_type: "ci-cd-specialist",
  description: "Debug release merge failure", 
  prompt: `Our release merge automation failed with a security scanning error. 
           Analyze the logs, identify the root cause, and provide a fix that 
           ensures security compliance while unblocking the release process.`
});
```

### Method 2: Helper Script (Recommended)

Use the provided helper script for context-aware prompts:

```bash
# Monitor CI/CD pipeline health
./.claude/invoke-ci-cd-specialist.sh monitor

# Debug specific workflow
./.claude/invoke-ci-cd-specialist.sh debug --workflow=release-merge.yml

# Emergency response
./.claude/invoke-ci-cd-specialist.sh emergency

# Performance optimization
./.claude/invoke-ci-cd-specialist.sh optimize --verbose
```

### Method 3: Manual Configuration

For custom scenarios, reference the configuration in `.claude/subagent-config.json`:

```json
{
  "subagent_type": "ci-cd-specialist",
  "context": {
    "project": "CreativeWriter2",
    "current_issue": "Describe your specific issue",
    "required_outcome": "What you need accomplished"
  }
}
```

---

## 📋 Common Use Cases

### 🔍 Pipeline Monitoring & Health Checks
```bash
./.claude/invoke-ci-cd-specialist.sh monitor
```
**When to use:** Daily health checks, weekly reviews, after major changes

**What it provides:**
- Overall pipeline health assessment
- Build success/failure rate analysis  
- Performance metrics and trends
- Security compliance status
- Actionable recommendations

### 🐛 Debugging Failed Workflows
```bash
./.claude/invoke-ci-cd-specialist.sh debug --workflow=release-merge.yml --verbose
```
**When to use:** Workflow failures, build errors, deployment issues

**What it provides:**
- Root cause analysis of failures
- Step-by-step debugging process
- Configuration validation
- Dependency conflict resolution
- Fix implementation guidance

### ⚡ Performance Optimization
```bash
./.claude/invoke-ci-cd-specialist.sh optimize --workflow=docker-build.yml
```
**When to use:** Slow builds, resource optimization, cost reduction

**What it provides:**
- Build time bottleneck analysis
- Caching strategy optimization
- Resource utilization improvements
- Parallelization opportunities
- Cost-effectiveness analysis

### 🚨 Emergency Response
```bash
./.claude/invoke-ci-cd-specialist.sh emergency
```
**When to use:** Production failures, critical security issues, urgent rollbacks

**What it provides:**
- Immediate impact assessment
- Emergency containment procedures
- Fast rollback execution
- Service restoration steps
- Incident communication plan

### 🔒 Security Analysis
```bash
./.claude/invoke-ci-cd-specialist.sh security --verbose
```
**When to use:** Security audits, vulnerability assessment, compliance checks

**What it provides:**
- Comprehensive security scan results
- Vulnerability prioritization
- Remediation recommendations
- Compliance validation
- Supply chain security analysis

---

## 🎯 Specialized Scenarios

### Release Merge Failures
```javascript
Task({
  subagent_type: "ci-cd-specialist",
  description: "Fix release merge automation",
  prompt: `The automated release merge from main to release branch failed. 
           The error indicates a conflict in the GitHub Actions workflow files.
           Please analyze the conflict, resolve it safely, and ensure the 
           merge automation continues working for future releases.
           
           Required: Preserve all existing functionality while fixing the issue.`
});
```

### Docker Build Optimization  
```javascript
Task({
  subagent_type: "ci-cd-specialist", 
  description: "Optimize Docker builds",
  prompt: `Our Docker build pipeline is taking over 15 minutes per build, 
           which is blocking development velocity. Analyze the current 
           Dockerfile and build process, identify bottlenecks, and implement
           optimization strategies to reduce build time by at least 50%.
           
           Focus on: Layer caching, multi-stage builds, and parallel processing.`
});
```

### Security Compliance Issue
```javascript
Task({
  subagent_type: "ci-cd-specialist",
  description: "Resolve security scan failures", 
  prompt: `CodeQL security scanning is failing our CI pipeline with several 
           high-severity findings. Analyze the security issues, determine 
           which are false positives vs. real vulnerabilities, and provide
           a remediation plan that addresses real issues without breaking
           existing functionality.
           
           Priority: Unblock releases while maintaining security standards.`
});
```

---

## 📊 Integration Points

The CI/CD Specialist integrates with:

### 🔄 Existing Workflows
- **Main Branch CI** (`ci-main.yml`) - Comprehensive validation pipeline
- **Release Merge** (`release-merge.yml`) - Intelligent merge automation  
- **PR Validation** (`pr-validation.yml`) - Pull request quality gates
- **Docker Builds** (`docker-*.yml`) - Container image building
- **Public Sync** (`sync-public.yml`) - Public repository synchronization

### 🛠️ Tools & Services  
- **GitHub Actions** - Workflow execution and management
- **Docker Hub/GHCR** - Container registry operations
- **CodeQL** - Security scanning integration
- **Node.js/Angular** - Build system optimization
- **Git** - Branch management and merge operations

### 📈 Monitoring & Analytics
- **Build Metrics** - Success rates, duration, resource usage
- **Security Metrics** - Vulnerability tracking, compliance status
- **Performance Metrics** - Pipeline efficiency, developer experience
- **Cost Metrics** - Resource utilization, optimization opportunities

---

## 🔧 Configuration Files

### Core Configuration
- **`.claude/subagent-config.json`** - Main subagent definitions and capabilities
- **`.claude/subagents/ci-cd-specialist.md`** - Detailed specialist documentation  
- **`.claude/invoke-ci-cd-specialist.sh`** - Helper script for common operations

### Integration Files
- **`.github/workflows/`** - GitHub Actions workflow definitions
- **`docker-compose.yml`** - Multi-service container orchestration
- **`Dockerfile`** - Container image definitions
- **`package.json`** - Node.js build scripts and dependencies

---

## 📚 Best Practices

### 🎯 When to Use the CI/CD Specialist
- **Complex multi-step CI/CD issues** requiring expert analysis
- **Performance optimization** needs affecting developer productivity  
- **Security compliance** requirements and vulnerability management
- **Emergency situations** requiring immediate expert response
- **Strategic planning** for CI/CD improvements and modernization

### ✅ Success Criteria
- **Faster issue resolution** - Expert analysis reduces debugging time
- **Higher reliability** - Proactive monitoring prevents issues
- **Better performance** - Optimization recommendations improve efficiency
- **Enhanced security** - Comprehensive scanning and remediation  
- **Improved developer experience** - Smoother development workflows

### 📊 Measuring Impact
- **Mean Time to Recovery** - How quickly issues are resolved
- **Build Success Rate** - Percentage of successful pipeline runs
- **Developer Productivity** - Time saved on CI/CD-related tasks
- **Security Posture** - Vulnerabilities identified and remediated
- **Cost Optimization** - Resource utilization improvements

---

## 🆘 Troubleshooting

### Script Issues
```bash
# Make script executable
chmod +x .claude/invoke-ci-cd-specialist.sh

# Check script syntax
bash -n .claude/invoke-ci-cd-specialist.sh

# Run with debug output
bash -x .claude/invoke-ci-cd-specialist.sh monitor
```

### Configuration Issues
```bash
# Validate JSON configuration
cat .claude/subagent-config.json | jq '.'

# Check file permissions
ls -la .claude/
```

### Task Tool Integration
If the Task tool doesn't recognize the subagent:
1. Verify the subagent type matches the configuration
2. Check that all required files are present
3. Ensure the configuration JSON is valid
4. Review the prompt format and required parameters

---

## 🎉 Getting Started

1. **Test the Helper Script**
   ```bash
   ./.claude/invoke-ci-cd-specialist.sh monitor --dry-run
   ```

2. **Run Your First Health Check**
   ```bash
   ./.claude/invoke-ci-cd-specialist.sh monitor
   ```

3. **Try a Debug Session**
   ```bash
   ./.claude/invoke-ci-cd-specialist.sh debug --workflow=ci-main.yml
   ```

4. **Use with Claude Code Task Tool**
   ```javascript
   Task({
     subagent_type: "ci-cd-specialist",
     description: "Pipeline health check",
     prompt: "Perform a comprehensive health check of all CI/CD workflows"
   });
   ```

The CI/CD Specialist is ready to help you maintain and optimize your CreativeWriter2 deployment pipeline! 🚀