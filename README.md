# approver action

This action checks if all approvals of a PR match given rules.

## Inputs

### `gh_token`

**Required** The Github token to access the repository to check.

### `approvers_file`

**Optional** The path to the file where approver rules are defined. The syntax
of the file is as follows:

```yaml
- regex: ^feature/
  approver:
    - team:MyApproverGroup
    - user:RobotUser9
- regex: ^bugfix/
  approver:
    - user:Foo
```

**Default**: `.approvers.yaml`

## Outputs

None

## Example usage

```yaml
name: Approvals Check

on:
  pull_request_review:
    types: [submitted]

permissions:
  contents: read

jobs:
  approvals:
    name: Approvals Check
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        id: checkout
        uses: actions/checkout@v4

      - name: Install Dependencies
        id: npm-ci
        run: npm ci

      - name: Check approvals
        id: check-approvals
        uses: ./
        with:
          approvers_file: .approvers.yaml
          token: ${{ secrets.GITHUB_TOKEN }}
          pr_number: ${{ github.event.pull_request.number }}
```

## Configuration examples

In the following there is a minimal example of the `.approvers.yaml` file. If no other option is being used then every listed approver needs to approve the PR to fulfill the requirement. If a team is defined then each member of the team needs to approve the PR.

```yaml
- regex: ^feature/
  approver:
    - team:MyApproverGroup
    - user:RobotUser9
```

You can limit how many approvers need to approve the pull request by setting the `count` keyword:

```yaml
- regex: ^feature/
  count: 1
  approver:
    - team:MyApproverGroup
    - user:RobotUser9
```

You can have different rules for defined regex pattern like below:

```yaml
- regex: ^feature/
  approver:
    - team:MyApproverGroup
    - user:RobotUser9
- regex: ^bugfix/
  approver:
    - user:Foo
```

You can also define a default rule which is identified by the default keyword. If you have multiple default rules defined the first which is found is being returned and is applied to the PR:

```yaml
- regex: ^feature/
  approver:
    - team:MyApproverGroup
    - user:RobotUser9
- regex: ^bugfix/
  approver:
    - user:Foo
- default: true
  approver:
    - user:Foo
```

## Test locally

To test the action locally, first install [`act`](https://github.com/nektos/act). Then you need to update the `event.json` file to match an already open pull request. Afterwards you can simply run:

```bash
npm run test:local
```
