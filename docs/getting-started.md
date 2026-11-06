# Set up Clerk

You start a project and send one message. Your agent downloads Clerk and the medical libraries, installs what is needed, and puts the files in place.

## 1. Open a new local project

1. Open the [ChatGPT desktop app](https://learn.chatgpt.com/docs/quickstart) and sign in.
2. Choose **Codex** from the ChatGPT dropdown.
3. Create a new **local project** connected to an empty folder. You can create a folder called **Clerk** in Documents and select it.

The local project gives the agent access to that folder and the tools it needs for setup. If you have already created a project, use **Edit project → Add folder** to select the empty folder and make it primary. [Official local-project instructions](https://learn.chatgpt.com/docs/projects#use-local-projects-for-folders-and-codebases).

A regular ChatGPT project with uploaded files cannot run this setup. Use the desktop app's local project in Codex mode. Another agent with local file access and command execution can use the same setup message.

## 2. Paste this message

```text
Set up https://github.com/ahmadhajji/clerk in this project folder.
Follow its AGENTS.md and docs/agent-install.md. Install the requirements,
download and prepare all three libraries, and verify search and citations.
Tell me when I can start studying.
```

The GitHub link tells your agent where to get Clerk. It will obtain the project files, read the setup instructions, install the required tools, download all three provided libraries, and prepare and verify the search index. You do not need to open a release page, download a separate library ZIP, or copy files between folders.

Keep the app open during setup. The libraries are about 2.7 GiB to download; allow around 10 GB of free disk space for the complete setup. If your computer needs a system installer or permission that only you can grant, the agent should explain the clicks in plain English.

Clerk's downloads are public and need no GitHub account or download token. Your chosen AI app still needs its usual model access and may have usage charges or limits.

## 3. Start studying

Wait until the agent confirms that setup passed, then ask:

> I always mix up nephritic and nephrotic syndrome.

The agent should search the installed libraries and explain the answer with source citations. It can include a useful comparison table or original source image when available and supported by your app.

For another topic, start a new chat inside the same project. Keep the project folder in place so your libraries and citations remain available.

## If you need help

| What happens | What to do |
| --- | --- |
| The agent cannot work with the folder or run setup | Check that you selected Codex and opened a local project in the desktop app. |
| A system installer needs your input | Follow the steps the agent gives for your computer, then ask it to continue. |
| Setup reports an error | Paste the error into the same chat and ask the agent to diagnose it. It should explain any remaining blocker before calling setup ready. |

Prefer to run installation commands yourself? Use the [manual installation guide](manual-install.md). The [agent setup guide](agent-install.md) contains the procedure for automated installation.
