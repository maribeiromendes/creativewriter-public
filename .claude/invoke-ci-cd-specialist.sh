#!/bin/bash

# CI/CD Specialist Subagent Invocation Script
# This script provides a convenient interface for invoking the CI/CD specialist subagent

set -euo pipefail

# Configuration
SUBAGENT_TYPE="ci-cd-specialist"
CLAUDE_CONFIG_DIR=".claude"
LOG_FILE="${CLAUDE_CONFIG_DIR}/ci-cd-specialist.log"

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

# Function to log messages
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to display usage
usage() {
    cat << 'EOF'
🚀 CI/CD Specialist Subagent Invocation Script

USAGE:
    ./invoke-ci-cd-specialist.sh <mode> [options]

MODES:
    monitor         - Check CI/CD pipeline health and status
    debug           - Debug specific workflow or pipeline issues  
    optimize        - Analyze and optimize pipeline performance
    emergency       - Emergency response for critical CI/CD issues
    maintenance     - Routine maintenance and updates
    rollback        - Execute rollback procedures
    security        - Security-focused analysis and remediation

OPTIONS:
    --workflow=<name>     Specify workflow file to focus on
    --branch=<name>       Specify branch context (default: current)
    --verbose            Enable verbose logging
    --dry-run            Show what would be done without executing
    --help               Show this help message

EXAMPLES:
    # Monitor overall CI/CD health
    ./invoke-ci-cd-specialist.sh monitor

    # Debug specific workflow failure
    ./invoke-ci-cd-specialist.sh debug --workflow=release-merge.yml

    # Emergency rollback
    ./invoke-ci-cd-specialist.sh emergency --rollback

    # Optimize Docker build performance  
    ./invoke-ci-cd-specialist.sh optimize --workflow=docker-build.yml

    # Security analysis of all workflows
    ./invoke-ci-cd-specialist.sh security --verbose

INTEGRATION:
    This script is designed to work with Claude Code's Task tool.
    The subagent configuration is defined in .claude/subagent-config.json

EOF
}

# Parse command line arguments
MODE=""
WORKFLOW=""
BRANCH=$(git branch --show-current 2>/dev/null || echo "main")
VERBOSE=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        monitor|debug|optimize|emergency|maintenance|rollback|security)
            MODE="$1"
            shift
            ;;
        --workflow=*)
            WORKFLOW="${1#*=}"
            shift
            ;;
        --branch=*)
            BRANCH="${1#*=}"
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --help|-h)
            usage
            exit 0
            ;;
        *)
            echo "❌ Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Validate mode
if [[ -z "$MODE" ]]; then
    echo "❌ Error: Mode is required"
    usage
    exit 1
fi

# Function to generate context-aware prompts
generate_prompt() {
    local mode="$1"
    local workflow="$2"
    local branch="$3"
    
    case "$mode" in
        monitor)
            cat << EOF
🔍 CI/CD Health Monitoring Request

Current Context:
- Repository: CreativeWriter2
- Branch: $branch
- Timestamp: $(date -u '+%Y-%m-%d %H:%M:%S UTC')

Tasks Required:
1. Analyze current status of all GitHub Actions workflows
2. Check recent build success/failure rates
3. Verify Docker image builds and deployments
4. Review security scan results
5. Assess overall pipeline health

Focus Areas:
- Recent workflow runs and their outcomes
- Performance metrics (build times, success rates)
- Any pending or failed builds
- Resource utilization and potential bottlenecks
- Security compliance status

Deliverable: Comprehensive health report with actionable recommendations
EOF
            ;;
        debug)
            cat << EOF
🐛 CI/CD Debugging Request

Issue Context:
- Repository: CreativeWriter2
- Branch: $branch
- Workflow: ${workflow:-"All workflows"}
- Timestamp: $(date -u '+%Y-%m-%d %H:%M:%S UTC')

Debug Requirements:
1. Identify root cause of CI/CD pipeline failures
2. Analyze workflow logs and error messages
3. Check configuration consistency and syntax
4. Verify environment variables and secrets
5. Test workflow dependencies and integrations

Investigation Areas:
- GitHub Actions workflow execution logs
- Docker build failures and image issues
- Security scanning false positives or failures
- Dependency conflicts or version mismatches
- Infrastructure or service availability issues

Deliverable: Root cause analysis with step-by-step resolution plan
EOF
            ;;
        optimize)
            cat << EOF
⚡ CI/CD Performance Optimization Request

Optimization Context:
- Repository: CreativeWriter2  
- Branch: $branch
- Target Workflow: ${workflow:-"All workflows"}
- Timestamp: $(date -u '+%Y-%m-%d %H:%M:%S UTC')

Optimization Goals:
1. Reduce overall build and deployment times
2. Optimize resource utilization and costs
3. Improve pipeline reliability and success rates
4. Enhance developer experience and feedback loops
5. Implement caching and parallelization strategies

Analysis Areas:
- Build time bottlenecks and optimization opportunities
- Docker image layer optimization and caching
- Workflow parallelization and job dependencies
- Resource allocation and cost effectiveness
- Integration points and external service delays

Deliverable: Performance optimization plan with measurable improvements
EOF
            ;;
        emergency)
            cat << EOF
🚨 EMERGENCY CI/CD Response Request

CRITICAL SITUATION:
- Repository: CreativeWriter2
- Branch: $branch  
- Emergency Context: CI/CD system failure or critical issue
- Timestamp: $(date -u '+%Y-%m-%d %H:%M:%S UTC')

IMMEDIATE ACTIONS REQUIRED:
1. Assess scope and impact of the emergency
2. Implement immediate containment measures
3. Execute appropriate rollback or recovery procedures
4. Restore service availability with minimal downtime
5. Communicate status and estimated resolution time

EMERGENCY PROCEDURES:
- Production deployment rollback if needed
- Workflow bypass for critical hotfixes
- Service restoration and health verification
- Incident communication and status updates
- Post-emergency analysis and prevention

PRIORITY: MAXIMUM - Immediate response required
EOF
            ;;
        maintenance)
            cat << EOF
🛠️ CI/CD Maintenance Request

Maintenance Context:
- Repository: CreativeWriter2
- Branch: $branch
- Maintenance Type: Routine system maintenance
- Timestamp: $(date -u '+%Y-%m-%d %H:%M:%S UTC')

Maintenance Tasks:
1. Update workflow dependencies and action versions
2. Review and update security configurations
3. Clean up outdated artifacts and cache
4. Verify backup and recovery procedures
5. Update documentation and runbooks

Maintenance Areas:
- GitHub Actions marketplace updates
- Docker base image security updates  
- Dependency vulnerability patching
- Configuration validation and cleanup
- Performance monitoring and alerting setup

Deliverable: Maintenance report with completed tasks and recommendations
EOF
            ;;
        rollback)
            cat << EOF
↩️ CI/CD Rollback Procedure Request

Rollback Context:
- Repository: CreativeWriter2
- Branch: $branch
- Rollback Target: Previous stable release
- Timestamp: $(date -u '+%Y-%m-%d %H:%M:%S UTC')

Rollback Requirements:
1. Identify last known good release/deployment
2. Execute safe rollback procedures
3. Verify rollback success and system stability
4. Update monitoring and alerting systems
5. Document rollback actions and lessons learned

Rollback Procedures:
- Git branch/tag rollback coordination
- Docker image version rollback
- Database migration rollback if needed
- Configuration rollback and verification
- Service health validation post-rollback

Deliverable: Successful rollback with stability verification
EOF
            ;;
        security)
            cat << EOF
🔒 CI/CD Security Analysis Request

Security Context:
- Repository: CreativeWriter2
- Branch: $branch
- Security Scope: Full CI/CD pipeline security review
- Timestamp: $(date -u '+%Y-%m-%d %H:%M:%S UTC')

Security Analysis Requirements:
1. Comprehensive security scan of all workflows
2. Secrets and credentials management review
3. Container image vulnerability assessment
4. Access control and permissions audit
5. Compliance validation against security standards

Security Areas:
- GitHub Actions secrets and environment security
- Docker image and container security scanning
- Dependency vulnerability management
- Code scanning and static analysis results
- Supply chain security and provenance

Deliverable: Security assessment report with prioritized remediation plan
EOF
            ;;
        *)
            echo "❌ Unknown mode: $mode"
            exit 1
            ;;
    esac
}

# Main execution
main() {
    log "🚀 Invoking CI/CD Specialist Subagent"
    log "Mode: $MODE"
    log "Workflow: ${WORKFLOW:-"All"}"
    log "Branch: $BRANCH"
    log "Verbose: $VERBOSE"
    log "Dry Run: $DRY_RUN"
    
    if [[ "$DRY_RUN" == true ]]; then
        log "🔍 DRY RUN MODE - No actual changes will be made"
        echo
        echo "Generated Prompt:"
        echo "=================="
        generate_prompt "$MODE" "$WORKFLOW" "$BRANCH"
        echo "=================="
        echo
        log "✅ Dry run completed - prompt generated successfully"
        exit 0
    fi
    
    # Generate the context-aware prompt
    local prompt
    prompt=$(generate_prompt "$MODE" "$WORKFLOW" "$BRANCH")
    
    log "📝 Generated prompt for mode: $MODE"
    
    # Log the prompt if verbose
    if [[ "$VERBOSE" == true ]]; then
        log "Prompt content:"
        echo "$prompt" | tee -a "$LOG_FILE"
    fi
    
    echo
    echo "🚀 CI/CD Specialist Subagent Ready"
    echo "=================================="
    echo "Mode: $MODE"
    echo "Context: CreativeWriter2 - $BRANCH branch"
    echo "Timestamp: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
    echo
    echo "📋 Generated Task Prompt:"
    echo "========================="
    echo "$prompt"
    echo "========================="
    echo
    echo "💡 Usage with Claude Code Task tool:"
    echo "Task({"
    echo "  subagent_type: \"ci-cd-specialist\","
    echo "  description: \"$MODE CI/CD operation\","
    echo "  prompt: \"[Copy the prompt above]\""
    echo "})"
    echo
    
    log "✅ CI/CD Specialist subagent invocation completed"
}

# Execute main function
main "$@"