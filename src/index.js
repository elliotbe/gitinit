#!/usr/bin/env node
import Github from './lib/Github.js'
import Prompt from './lib/Prompt.js'
import ConfigStore from './lib/ConfigStore.js'
import Spinner from './lib/Spinner.js'
import logo from './resource/logo_ascii.js'
import {
  argv,
  pkgInfo,
  directoryExist,
  currentDir,
  listDir,
  addGitIgnore,
  exec,
  helpFile,
} from './utils.js'
import { r, g, dw, up, lineClear } from './ansi-escape.js'

if (argv.flag.help) {
  console.log(`${up()}${lineClear()}${helpFile}`)
  process.exit()
}

if (argv.flag.version) {
  console.log(`${up()}${lineClear()}gitinit version ${pkgInfo.version}`)
  process.exit()
}

const main = async () => {
  console.clear()
  console.log(logo)

  if (directoryExist('.git')) {
    console.log(r('Already a git repository! Aborting…'))
    process.exit(1)
  }

  if (listDir().length === 0) {
    console.log(r("You can't commit an empty repository! Aborting…"))
    process.exit(1)
  }

  const configStore = ConfigStore('.gitinit')
  const github = Github()
  if (!configStore['access-token']) {
    const { username } = await Prompt({
      username: {
        question: 'Enter your Github username or email address:',
        validate: {
          type: 'notEmpty',
          message: 'Please enter your username or email address:',
        },
      },
    })
    console.log()
    const token = await github.authenticate(username)
    configStore.write({ 'access-token': token })
  } else {
    github.authToken = configStore['access-token']
  }

  const repository = await Prompt({
    name: {
      question: 'Enter the name of your repository:',
      prefill: argv.name || currentDir,
      validate: 'notEmpty',
    },

    description: {
      question: `Enter a short description of your repository${
        !argv.desc ? dw(' (optional)') : ''
      }:`,
      prefill: argv.desc,
    },

    visibility: {
      question: 'Public or private:',
      options: ['private', 'public'],
      type: 'radio',
      prefill: 'private',
    },

    gitIgnore: {
      question: 'What should be added to .gitignore?:',
      options: listDir(),
      type: 'select',
      prefill: 'node_modules/',
    },
  })

  const spinner = Spinner('Initializing you repository and pushing it to github…')
  spinner.start()

  try {
    addGitIgnore(repository.gitIgnore)
    await exec('git init')
    await exec('git add .')
    await exec('git commit -m "Initial commit"')
    const repoInfo = await github.createRepo(repository)
    await exec(`git remote add origin ${repoInfo.ssh_url}`)
    await exec('git push -u origin master')
    spinner.stop()
    console.log(
      g('Success! You can go see your repo at:'),
      `https://github.com/${repoInfo.full_name}`
    )
  } catch (error) {
    spinner.stop()
    await exec(`rm -rf .git .gitignore`)
    console.error(r(error.message))
    process.exit(1)
  }

  console.log(g('Thanks for using gitinit!'))
}

main()
