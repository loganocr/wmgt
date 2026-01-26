# Administrator Guide

Administrators have full system access to WMGT. This guide covers the elevated functions beyond what Tournament Admins can do.

## Administrator Responsibilities

- Managing user access and roles
- System configuration and parameters
- Build options (feature toggles)
- Granting permissions to new admins and contributors

## Managing User Access

### Granting Roles

1. Navigate to **Administration** → **Manage User Access** (Page 10041)
2. Find the user by email/username
3. Assign one or more roles:
   - **Contributor** — Score verification access
   - **Tournament Admin** — Full tournament operations
   - **Administrator** — Full system access

### Adding New Users

1. Go to **Administration** → **Manage User Access**
2. Click **Add Multiple Users** or add individually
3. Enter their email address
4. Assign appropriate role(s)
5. Save

> 💡 Most users log in via Discord OAuth and are automatically created. You only need to manually add users who need elevated access.

### Removing Access

1. Find the user in **Manage User Access**
2. Remove their roles or delete their access entry

## Application Configuration

### Configuration Options (Page 10010)

Access via **Administration** → **Configuration Options**

Key settings:
- **ACCESS_CONTROL_SCOPE** — Controls who can access the app
  - `ALL_USERS` — Anyone can view (public)
  - `ACL_ONLY` — Only users in the Access Control List

### System Parameters (Page 560)

Navigate to **Tournament Admin** → **System Parameters**

These control various application behaviors. Common parameters include:
- Bucket paths for assets
- Default values
- Feature flags

> ⚠️ **Be careful** — Changing system parameters can affect tournament operations. Consult with El Jorge before making changes.

## Build Options

Build options control which features are enabled/disabled in the application. These are managed through APEX Application Builder, not the runtime application.

Common build options:
- Enable/disable specific pages
- Toggle experimental features
- Control debug features

## Monitoring

### Activity Dashboard (Page 10030)

View application usage:
- Active users
- Page views
- Performance metrics

### Application Error Log (Page 10032)

Review errors and exceptions:
- Error messages
- Stack traces
- Timestamps

### Page Performance (Page 10033)

Identify slow pages and optimize.

## Discord Integration

### Discord Guilds (Page 10080)

Manage Discord server connections:
- View connected guilds
- Configure guild settings
- Manage bot permissions

### Webhook Setup

Webhooks allow external services to send data to WMGT:
- **Webhook Definitions** (Page 10070)
- **Webhook Setup** (Page 10075)

## Job Reporting (Page 10090)

Monitor scheduled jobs:
- Score entry close jobs
- Automated processes
- Job run history and status

## Emergency Procedures

### Application Unavailable

If you need to take the app offline:
1. Use the `unavailable_application` procedure
2. Or modify the application availability in APEX Builder

### Database Issues

Contact the database administrator (Jorge) for:
- Performance problems
- Data corruption
- Backup/restore needs

### Reverting a Closed Tournament

This is complex and requires database intervention:
1. Document what went wrong
2. Contact Jorge
3. Database changes may be required to reopen

## Best Practices

1. **Least privilege** — Only grant the minimum role needed
2. **Audit changes** — Keep track of who has access and why
3. **Test carefully** — System parameter changes can have wide effects
4. **Document** — Note any configuration changes you make

## Escalation

For issues beyond your scope:
- Technical/database issues → Jorge
- Policy decisions → Staff consensus in Discord

---

*Questions? Ask in the #staff channel on Discord.*
