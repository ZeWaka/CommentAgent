# CommentAgent

> A GitHub bot to trigger a configured GitHub action based on found text in a comment from an authorized user. Built with [probot](https://github.com/probot/probot) and [glitch](https://glitch.com).

Current version: `0.1.0`

Marketplace link: https://github.com/marketplace/commentagent

## Installation

After installation, create a `.github/commentagent.yml` file in the default branch to enable it.
Example configuration:

```yml
# A mapping of keyword aliases to event type. Form of match:action name.
# Required.
aliasMappings:
  "[BuildPlease]": "Build_Action"
  ?buildme: "Build_Action"
  ?triage: triage

# Determines if alias matching is case sensitive.
# Optional. Defaults to true.
caseSensitive: true

# A mapping of action names to user group permissions.
# Form of event type:group name or combined names (Explained lower in the README). 
# Optional, defaults to MEMBER for each.
permissionMappings:
  "BuildAction": [MEMBER, CONTRIBUTOR, PRAUTHOR]
  triage: 'CONTRIBUTOR'
```

## Usage
You also need to set up an action triggered by the configuration-specified event type, example:
```
on:
  repository_dispatch:
    types: [Build_Action]

jobs:
	hello-world:
    steps:
      - run: echo "Hello World!"
			- run: 'echo "PR Number: ${{ github.event.client_payload.pr_number }}"'
			- run: 'echo "Comment Author: ${{ github.event.client_payload.comment_author }}"'
			- run: 'echo "PR Head full repo name: ${{ github.event.client_payload.pr_head_full_repo_name }}"
			- run: 'echo "PR Head ref: ${{ github.event.client_payload.pr_head_ref }}"'
```
As seen used above, the bot also sends some useful information to the action like the PR number and comment author login name as payload information.
Feel free to request more sent information by filing an issue via GitHub.
**Note:** This does not currently support pull request review comments for triggering, only normal PR comments.

## Permission Field
The permission system supports allowing multiple permission levels to trigger an action, such as both someone who has previously committed to the repository and members of the organization that owns the repository. For an explanation and list of the levels, see [here](https://docs.github.com/en/graphql/reference/enums#commentauthorassociation). The bot also supports `PRAUTHOR` for the author of the pull request.

This is accomplished through the use of joining each level together with a pipe ("|"), as seen in the example configuration.

## Contributing

Read the [CONTRIBUTING](CONTRIBUTING.md) guide for information.

## License

Licensed under ISC. See [LICENSE](LICENSE) for more information.
