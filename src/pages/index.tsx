import { useEffect, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import { GhRibbon } from '../components/GhRibbon'
import { InputField } from '../components/InputField'
import { SpinnerIcon } from '../components/SpinnerIcon'
import { useChatCompletion } from '../components/hooks/chatHook'
import { githubAPIRequest, handleCopyToClipboard, openAIRequest, retrieveValueFromLocalStorage } from '../utils'

export default function Home() {
  const [openAIApiKey, setOpenAIApiKey] = useState('')
  const [repoUrl, setRepoUrl] = useState('')
  const [fileTree, setFileTree] = useState([])
  const [mergedFiles, setMergedFiles] = useState('')
  const [instruction, setInstruction] = useState(
    'Using Clean Code, refactor the following code to make it more readable.'
  )
  const [model, setModel] = useState('gpt-4')
  const [temperature, setTemperature] = useState(0.1)
  const [maxTokens, setMaxTokens] = useState(4000)
  const [models, setModels] = useState([{ name: 'gpt-4' }, { name: 'gpt-3.5-turbo' }])
  const [selectedFiles, setSelectedFiles] = useState([])
  const [gitHubToken, setGitHubToken] = useState('')
  const [githubError, setGithubError] = useState(null)
  const [openAIError, setOpenAIError] = useState(null)
  const [showCopyConfirmation, setShowCopyConfirmation] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showGithubToken, setShowGithubToken] = useState(false)
  const [isFetchingFileTree, setIsFetchingFileTree] = useState(false)
  const [expandedFolders, setExpandedFolders] = useState({})
  const [isLoadingFiles, setIsLoadingFiles] = useState(false)
  const {
    messages,
    loading: isCompletingChat,
    submitPrompt,
    error: chatCompletionError,
    abortResponse,
    resetMessages
  } = useChatCompletion({
    model: model as any,
    apiKey: openAIApiKey,
    temperature: Number(temperature),
    max_tokens: Number(maxTokens)
  })
  const assistantMessages = messages.filter((msg) => msg.role === 'assistant')

  useEffect(() => {
    retrieveValueFromLocalStorage('openai-api-key', setOpenAIApiKey, '')
    retrieveValueFromLocalStorage('github-token', setGitHubToken, '')
    retrieveValueFromLocalStorage('github-repo-url', setRepoUrl, 'https://github.com/Markkop/RepoGPT')
    retrieveValueFromLocalStorage('temperature', setTemperature, 0.1)
    retrieveValueFromLocalStorage('max-tokens', setMaxTokens, 4000)
    retrieveValueFromLocalStorage('model', setModel, 'gpt-4')
  }, [])

  const displayFileTree = async (fileTree, indentLevel = 0, parentPath = '') => {
    let allFiles = []
    for (const file of fileTree) {
      file.indentLevel = indentLevel
      const filePath = `${parentPath}/${file.name}`
      allFiles.push({ ...file, path: filePath })
      if (file.type === 'dir') {
        const headers = {} as any
        if (gitHubToken) {
          headers.Authorization = `token ${gitHubToken}`
        }
        const response = await fetch(file.url, { headers })
        const childFileTree = await response.json()
        // Ensure that childFileTree is an array before trying to iterate over it
        if (Array.isArray(childFileTree)) {
          const childFiles = await displayFileTree(childFileTree, indentLevel + 1, filePath)
          allFiles = [...allFiles, ...childFiles]
        } else {
          console.error('Child file tree is not iterable:', childFileTree)
        }
      }
    }
    return allFiles
  }

  const handleSelectFile = (file, checked) => {
    setSelectedFiles((prevFiles) => {
      if (checked) {
        // New file selected
        return [...prevFiles, file]
      } else {
        // File unselected, remove it
        return prevFiles.filter((f) => !f.path.startsWith(file.path))
      }
    })
  }

  const handleGetFileTree = async (e) => {
    try {
      e.preventDefault()
      setIsFetchingFileTree(true)
      setGithubError(null)
      localStorage.setItem('github-repo-url', repoUrl)
      const repoPath = repoUrl.split('github.com/')[1]
      const apiUrl = `https://api.github.com/repos/${repoPath}/contents`
      const json = await githubAPIRequest(apiUrl, gitHubToken)
      if (json.message) {
        throw new Error(json.message)
      }

      const completeFileTree = await displayFileTree(json)
      setFileTree(completeFileTree)
      setSelectedFiles([])
    } catch (error) {
      console.error(error)
      setGithubError(error.toString())
    } finally {
      setIsFetchingFileTree(false)
    }
  }

  const updateMergedFilesPreview = async () => {
    setIsLoadingFiles(true)
    const fileContents = await Promise.all(
      selectedFiles.map(async (file) => {
        try {
          const response = gitHubToken
            ? await githubAPIRequest(file.url, gitHubToken, true)
            : await githubAPIRequest(file.download_url, null, true)

          return `######## ${file.path}\n${response}`
        } catch (error) {
          console.error(error)
          setGithubError(error.message)
          return `######## ${file.path}\n${error.message}`
        }
      })
    )
    const mergedFiles = fileContents.join('\n')
    setMergedFiles(mergedFiles)
    setIsLoadingFiles(false)
  }

  useEffect(() => {
    updateMergedFilesPreview()
  }, [selectedFiles])

  const handleSendToOpenAI = async (e) => {
    try {
      e.preventDefault()
      setOpenAIError(null)
      if (!openAIApiKey) {
        setOpenAIError('Please enter an OpenAI API key')
        return
      }
      const messageContents = mergedFiles.split('\n########').map((content) => {
        return { role: 'user', content: '######## ' + content.trim() }
      })

      messageContents.push({ role: 'user', content: instruction })

      submitPrompt(messageContents as any)
    } catch (error) {
      console.error(error)
      setOpenAIError(error.message)
    }
  }

  const fetchModels = async () => {
    try {
      if (!openAIApiKey) return
      setOpenAIError(null)
      const openAiModels = await openAIRequest('GET', '/models', openAIApiKey)
      const models = openAiModels.data.map((model) => ({ name: model.id })).sort((a, b) => a.name.localeCompare(b.name))
      setModels(models)
    } catch (error) {
      console.error(error)
      setOpenAIError(error.message)
    }
  }

  useEffect(() => {
    fetchModels()
  }, [openAIApiKey])

  useEffect(() => {
    // Call this function when checkboxes state changes
    updateMergedFilesPreview()
  }, [fileTree])

  const handleFolderClick = (folderPath) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderPath]: !prev[folderPath],
    }))
  }

  return (
    <main className="bg-background text-secondary ">
      <div className="bg-surface font-sans px-5 max-w-5xl mx-auto shadow-l-lg relative py-4">
        <GhRibbon />
        <h1 className="font-bold text-2xl mb-5 text-primary">🗃️ RepoGPT</h1>

        <p>Merge files from a Github repository to send them to OpenAI API with a prompt.</p>
        <p className="text-sm opacity-70">
          Or copy/paste them into chatbots like{' '}
          <span className="text-accent hover:underline">
            <a href="https://chat.openai.com/">ChatGPT</a>
          </span>
        </p>

        <br />
        <form onSubmit={handleGetFileTree} className="mb-4">
          <div className="flex gap-2 flex-col-reverse lg:flex-row justify-between">
            {[
              {
                id: 'repo-url',
                type: 'text',
                label: 'Repo URL',
                placeholder: 'https://github.com/Markkop/RepoGPT',
                value: repoUrl,
                setValue: setRepoUrl,
                buttonText: 'Fetch'
              },
              {
                id: 'github-token',
                label: 'GitHub Token (optional)',
                type: showGithubToken ? 'text' : 'password',
                value: gitHubToken,
                placeholder: 'github_pat_11A...GCS',
                setValue: setGitHubToken,
                link: 'https://github.com/settings/tokens',
                buttonText: 'Save',
                showToggle: setShowGithubToken,
                isShowing: showGithubToken
              }
            ].map((field) => (
              <InputField field={field} key={field.id} isFetchingFileTree={isFetchingFileTree} />
            ))}
          </div>
          {githubError && <div className="text-error">{githubError}</div>}
        </form>
        <div className="flex flex-col lg:flex-row flex-wrap gap-2 mb-4">
          <div className="mb-2 lg:mb-5 lg:min-w-[225px]">
            <h2 className="mb-2">Select Files</h2>
            <div id="file-tree" className="text-sm">
              {fileTree.map((file, index) => (
                <div key={index} style={{ marginLeft: `${file.indentLevel * 10}px` }}>
                  <label
                    className={twMerge(
                      'text-secondary opacity-90',
                      selectedFiles.includes(file) && 'text-primary opacity-100',
                      file.type === 'dir' && 'opacity-70'
                    ) : (
                      <input
                        className="mr-2"
                        type="checkbox"
                        onChange={(e) => handleSelectFile(file, e.target.checked)}
                        checked={selectedFiles.includes(file)}
                      />
                    )}
                    {file.name}
                    {file.type === 'dir' && expandedFolders[file.path] && (
                      <div>
                        {fileTree
                          .filter((f) => f.path.startsWith(file.path) && f.path !== file.path)
                          .map((nestedFile, nestedIndex) => (
                            <div key={nestedIndex} style={{ marginLeft: `${(nestedFile.indentLevel + 1) * 10}px` }}>
                              <label
                                className={twMerge(
                                  'text-secondary opacity-90',
                                  selectedFiles.includes(nestedFile) && 'text-primary opacity-100',
                                  nestedFile.type === 'dir' && 'opacity-70'
                                )}
                              >
                                {nestedFile.type === 'dir' ? (
                                  <span onClick={() => handleFolderClick(nestedFile.path)} className="cursor-pointer">
                                    {expandedFolders[nestedFile.path] ? '📂' : '📁'} 
                                  </span>
                                ) : (
                                  <input
                                    className="mr-2"
                                    type="checkbox"
                                    onChange={(e) => handleSelectFile(nestedFile, e.target.checked)}
                                    checked={selectedFiles.includes(nestedFile)}
                                  />
                                )}
                                {nestedFile.name}
                              </label>
                            </div>
                          ))}
                      </div>
                    )}
                  >
                    {file.type === 'dir' ? (
                      <span onClick={() => handleFolderClick(file.path)} className="cursor-pointer">
                        {expandedFolders[file.path] ? '📂' : '📁'} 
                      </span>
                    ) : (
                      <input
                        className="mr-2"
                        type="checkbox"
                        onChange={(e) => handleSelectFile(file, e.target.checked)}
                        checked={selectedFiles.includes(file)}
                      />
                    )}
                    {file.name}
                  </label>
                </div>
              ))}
            </div>
          </div>
          <div className="flex-grow flex flex-col">
            <div className="flex space-x-2 mb-2">
              <h2>Merged Files</h2>
              <button
                onClick={() => handleCopyToClipboard(mergedFiles, setShowCopyConfirmation, navigator.clipboard)}
                className="text-xs px-1 py-0"
              >
                {showCopyConfirmation ? 'Copied!' : 'Copy'}
              </button>
              {isLoadingFiles && <SpinnerIcon />}
            </div>
            <textarea
              className="w-full flex-grow text-3xs"
              id="output"
              rows={10}
              cols={80}
              readOnly
              value={mergedFiles}
              onChange={(e) => setMergedFiles(e.target.value)}
            ></textarea>
          </div>
        </div>

        <div className="flex gap-2 lg:flex-row flex-col-reverse">
          <div className="flex flex-col flex-grow">
            <h2 className="mb-2">Prompt</h2>
            <textarea
              className="w-full flex-grow"
              id="instruction"
              name="instruction"
              rows={5}
              cols={80}
              placeholder="Using Clean Code, refactor the following code to make it more readable."
              required
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
            ></textarea>
          </div>
          <div className="flex flex-col items-left gap-2">
            {[
              {
                id: 'openai-api-key',
                label: 'OpenAI API Key',
                placeholder: 'sk-890r6E...KwrM',
                type: showPassword ? 'text' : 'password',
                value: openAIApiKey,
                setValue: setOpenAIApiKey,
                link: 'https://platform.openai.com/account/api-keys',
                buttonText: 'Save',
                showToggle: setShowPassword,
                isShowing: showPassword
              },
              {
                label: 'Model',
                id: 'models',
                type: 'select',
                value: model,
                setValue: setModel,
                options: models
              },
              {
                label: 'Temperature',
                id: 'temperature',
                type: 'number',
                min: 0,
                max: 1,
                step: '0.1',
                value: temperature,
                setValue: setTemperature
              },
              {
                label: 'Max Tokens',
                id: 'max-tokens',
                type: 'number',
                min: 1,
                step: '100',
                value: maxTokens,
                setValue: setMaxTokens
              }
            ].map((input, index) => (
              <InputField key={index} field={input} />
            ))}
          </div>
        </div>

        <button className="my-4" id="send-to-openai" onClick={isCompletingChat ? abortResponse : handleSendToOpenAI}>
          {isCompletingChat ? 'Abort' : 'Send to OpenAI'}
        </button>
        {openAIError && <div className="text-error">{openAIError}</div>}
        {chatCompletionError && <div className="text-error">{String(chatCompletionError)}</div>}

        <br />

        <h2 className="mb-2">OpenAI Response</h2>
        <textarea
          className="w-full resize mb-2"
          id="response"
          name="response"
          rows={20}
          cols={80}
          value={assistantMessages.length < 1 ? '' : assistantMessages.map((msg, i) => msg.content)}
        ></textarea>
      </div>
    </main>
  )
}
