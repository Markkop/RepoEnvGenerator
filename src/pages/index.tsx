import { useEffect, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import { GhRibbon } from '../components/GhRibbon'
import { InputField } from '../components/InputField'
import { SpinnerIcon } from '../components/SpinnerIcon'
import { generateEnvExample, githubAPIRequest, handleCopyToClipboard, retrieveValueFromLocalStorage } from '../utils'

export default function Home() {
  const [repoUrl, setRepoUrl] = useState('')
  const [fileTree, setFileTree] = useState([])

  const [gitHubToken, setGitHubToken] = useState('')
  const [githubError, setGithubError] = useState(null)
  const [showCopyConfirmation, setShowCopyConfirmation] = useState(false)
  const [showGithubToken, setShowGithubToken] = useState(false)
  const [isFetchingFileTree, setIsFetchingFileTree] = useState(false)
  const [expandedFolders, setExpandedFolders] = useState({})
  const [selectedFiles, setSelectedFiles] = useState([])
  const [envExampleContent, setEnvExampleContent] = useState('')
  const [isGeneratingEnvExample, setIsGeneratingEnvExample] = useState(false)

  useEffect(() => {
    retrieveValueFromLocalStorage('github-token', setGitHubToken, '')
    retrieveValueFromLocalStorage('github-repo-url', setRepoUrl, 'https://github.com/Markkop/RepoEnvGenerator')
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
      let updatedFiles
      if (checked) {
        updatedFiles = [...prevFiles, file]
      } else {
        updatedFiles = prevFiles.filter((f) => !f.path.startsWith(file.path))
      }

      // Select/unselect nested files and folders
      if (file.type === 'dir') {
        const nestedFiles = fileTree.filter((f) => f.path.startsWith(file.path))
        nestedFiles.forEach((nestedFile) => {
          if (checked) {
            if (!updatedFiles.includes(nestedFile)) {
              updatedFiles.push(nestedFile)
            }
          } else {
            updatedFiles = updatedFiles.filter((f) => f.path !== nestedFile.path)
          }
        })
      }

      return updatedFiles
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
      setSelectedFiles(completeFileTree)
    } catch (error) {
      console.error(error)
      setGithubError(error.toString())
    } finally {
      setIsFetchingFileTree(false)
    }
  }

  const handleGenerateEnvExample = async () => {
    setIsGeneratingEnvExample(true)
    try {
      const content = await generateEnvExample(repoUrl, gitHubToken, selectedFiles)
      setEnvExampleContent(content)
    } catch (error) {
      console.error(error)
      setGithubError(error.toString())
    } finally {
      setIsGeneratingEnvExample(false)
    }
  }

  const handleFolderClick = (folderPath) => {
    setExpandedFolders((prev) => {
      const isExpanded = !prev[folderPath]
      const updatedFolders = { ...prev, [folderPath]: isExpanded }

      // Select/unselect nested files and folders
      const nestedFiles = fileTree.filter((file) => file.path.startsWith(folderPath))
      nestedFiles.forEach((file) => handleSelectFile(file, isExpanded))

      return updatedFolders
    })
  }

  return (
    <main className="bg-background text-secondary">
      <div className="bg-surface font-sans px-5 max-w-5xl mx-auto shadow-l-lg relative py-4">
        <GhRibbon />
        <h1 className="font-bold text-2xl mb-5 text-primary">📂 Repo Env Generator</h1>

        <p>Extract environment variables usage from a GitHub repository</p>

        <br />
        <form onSubmit={handleGetFileTree} className="mb-4">
          <div className="flex gap-2 flex-col-reverse lg:flex-row justify-between">
            {[
              {
                id: 'repo-url',
                type: 'text',
                label: 'Repo URL',
                placeholder: 'https://github.com/Markkop/RepoEnvGenerator',
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
          <div className="lg:min-w-[225px] flex flex-col">
            <div className="flex space-x-2">
              <h2>Select Files</h2>
              <div className="flex gap-2">
                {['none', 'all'].map((option) => (
                  <button
                    onClick={() => (option === 'none' ? setSelectedFiles([]) : setSelectedFiles(fileTree))}
                    className="text-xs px-1 py-0 w-12"
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div id="file-tree" className="text-sm flex-grow mb-2">
              {fileTree.map((file, index) => (
                <div key={index} style={{ marginLeft: `${file.indentLevel * 10}px` }}>
                  <label
                    className={twMerge(
                      'text-secondary opacity-90',
                      selectedFiles.includes(file) && 'opacity-100',
                      file.type === 'dir' && 'text-primary',
                      expandedFolders[file.path] && 'font-bold'
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
              <h2>.env.example</h2>
              <button
                onClick={handleGenerateEnvExample}
                className="text-xs px-1 py-0 w-20"
                disabled={isGeneratingEnvExample}
                id="generate-env-example"
              >
                {isGeneratingEnvExample ? <SpinnerIcon className="h-3 w-3" /> : 'Generate'}
              </button>
              <button
                onClick={() => handleCopyToClipboard(envExampleContent, setShowCopyConfirmation, navigator.clipboard)}
                className="text-xs px-1 py-0"
              >
                {showCopyConfirmation ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <textarea
              className="w-full text-3xs"
              id="output"
              rows={10}
              cols={80}
              readOnly
              value={envExampleContent}
              onChange={(e) => setEnvExampleContent(e.target.value)}
            ></textarea>
          </div>
        </div>
      </div>
    </main>
  )
}
