import { ExternalLink } from './ExternalLink'
import { GhRibbonSvg } from './GhRibbonSvg'

export function GhRibbon() {
  return (
    <div className="animate-ribbon absolute top-0 right-0">
      <ExternalLink href="https://github.com/Markkop/RepoEnvGenerator">
        <GhRibbonSvg />
      </ExternalLink>
    </div>
  )
}
