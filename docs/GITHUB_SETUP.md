# GitHub Setup and Best Practices

## Initial Repository Setup

1. **Create a new repository** on GitHub (skip for this project)
   - Visit [GitHub's Create Repository page](https://github.com/new)
   - Initialize with a README.md
   - Add `.gitignore` for your project type (Node.js and Java)
   - Add an appropriate license
   - [Official Documentation: Creating a repository](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-new-repository

2. **Branch Protection Rules**
   - Go to repository Settings > Branches
   - Add rule for `main` branch
   - Enable:
     - Require pull request reviews before merging
     - Require at least 1 approval (as per project requirements)
     - Require status checks to pass before merging
     - Include administrators in these restrictions
   - [Official Documentation: Branch protection rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/managing-a-branch-protection-rule)

## Commit Best Practices

1. **Conventional Commits**
   - Follow the [Conventional Commits specification](https://www.conventionalcommits.org/)
   - Format: `type(scope): description`
   - Types:
     - `feat`: New feature
     - `fix`: Bug fix
     - `docs`: Documentation changes
     - `style`: Code style changes
     - `refactor`: Code refactoring
     - `test`: Adding or modifying tests
     - `chore`: Maintenance tasks

2. **Git Hooks Setup**
   - Use [Husky](https://typicode.github.io/husky/) for Git hooks
   - Install commitlint for commit message validation
   ```bash
   npm install --save-dev @commitlint/config-conventional @commitlint/cli husky
   ```
   - [Official Husky Documentation](https://typicode.github.io/husky/)
   - [Official Commitlint Documentation](https://commitlint.js.org/)

## GitHub Actions Setup

### GitHub Actions Availability and Pricing

1. **For Public Repositories**
   - Completely free
   - 2,000 minutes per month of workflow runtime
   - Unlimited workflow storage
   - Access to GitHub-hosted runners (Linux, Windows, and macOS)
   - [GitHub Actions Pricing Details](https://docs.github.com/en/billing/managing-billing-for-github-actions/about-billing-for-github-actions)

2. **For Private Repositories**
   - Free tier includes:
     - 2,000 minutes per month for free accounts
     - 3,000 minutes per month for Pro accounts
     - 50,000 minutes per month for Team accounts
   - Storage limitations:
     - 500MB storage for free accounts
     - 2GB storage for Pro accounts
     - 50GB storage for Team accounts
   - Additional minutes can be purchased
   - [Private Repository Pricing](https://github.com/pricing)

### Enabling GitHub Actions

1. **Repository Settings**
   - Go to your repository on GitHub
   - Click on "Settings" tab
   - Select "Actions" from the left sidebar
   - Under "Actions permissions":
     - Enable "Allow all actions and reusable workflows"
     - Or choose specific restrictions if needed
   - [Official Documentation: Managing GitHub Actions Settings](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository)

2. **Workflow File Location**
   - Create `.github/workflows` directory in your repository
   - Add your workflow YAML files in this directory
   - Files are automatically detected and workflows are enabled

3. **Environment Setup**
   - Go to repository Settings > Environments
   - Click "New environment" to create environments (e.g., production, staging)
   - Configure environment protection rules and secrets
   - [Environment Configuration Documentation](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment)

4. **Repository Secrets**
   - Go to Settings > Secrets and variables > Actions
   - Add required secrets (e.g., API keys, tokens)
   - These can be accessed in workflows using `${{ secrets.SECRET_NAME }}`
   - [Managing Encrypted Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)

### Example CI Pipeline Setup
   Create `.github/workflows/ci.yml`:
   ```yaml
   name: CI Pipeline
   
   on:
     push:
       branches: [ main ]
     pull_request:
       branches: [ main ]
   
   jobs:
     backend:
       runs-on: ubuntu-latest
       
       steps:
       - uses: actions/checkout@v3
       
       - name: Set up JDK 21
         uses: actions/setup-java@v3
         with:
           java-version: '21'
           distribution: 'corretto'
           
       - name: Build and Test Backend
         run: |
           cd backend
           mvn clean verify
           
       - name: Upload Backend Test Coverage
         uses: actions/upload-artifact@v3
         with:
           name: backend-coverage
           path: backend/target/site/jacoco/
   
     frontend:
       runs-on: ubuntu-latest
       
       steps:
       - uses: actions/checkout@v3
       
       - name: Set up Node.js
         uses: actions/setup-node@v3
         with:
           node-version: '20'
           
       - name: Install Dependencies
         run: |
           cd frontend
           npm ci
           
       - name: Run Tests and Coverage
         run: |
           cd frontend
           npm run test -- --coverage
           
       - name: Upload Frontend Test Coverage
         uses: actions/upload-artifact@v3
         with:
           name: frontend-coverage
           path: frontend/coverage/
   ```

   [Official GitHub Actions Documentation](https://docs.github.com/en/actions)

2. **SonarCloud Integration**
   ```yaml
   name: SonarCloud Analysis
   
   on:
     push:
       branches: [ main ]
     pull_request:
       branches: [ main ]
   
   jobs:
     sonarcloud:
       runs-on: ubuntu-latest
       
       steps:
       - uses: actions/checkout@v3
         with:
           fetch-depth: 0
           
       - name: SonarCloud Scan
         uses: SonarSource/sonarcloud-github-action@master
         env:
           GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
           SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
   ```
   
   [Official SonarCloud Documentation](https://sonarcloud.io/documentation)

## Pull Request Template

Create `.github/pull_request_template.md`:
```markdown
## Description
[Describe the changes made in this PR]

## Type of change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## How Has This Been Tested?
[Describe the tests you ran]

## Checklist:
- [ ] My code follows the project's style guidelines
- [ ] I have performed a self-review of my code
- [ ] I have commented my code in hard-to-understand areas
- [ ] I have updated the documentation accordingly
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
```

[Official Documentation: Creating a pull request template](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/creating-a-pull-request-template-for-your-repository)

## Additional Resources

- [GitHub Flow Guide](https://guides.github.com/introduction/flow/)
- [Git Branching Strategies](https://git-scm.com/book/en/v2/Git-Branching-Branching-Workflows)
- [GitHub Security Best Practices](https://docs.github.com/en/code-security)
- [GitHub Actions Marketplace](https://github.com/marketplace?type=actions)
