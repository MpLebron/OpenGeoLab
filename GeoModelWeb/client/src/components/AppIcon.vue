<template>
  <component
    :is="IconComponent"
    class="app-icon"
    :size="numericSize"
    :stroke-width="numericStrokeWidth"
    aria-hidden="true"
    focusable="false"
  />
</template>

<script setup>
import { computed } from 'vue'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookMarked,
  BookOpen,
  Box,
  Boxes,
  Check,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  CircleHelp,
  CirclePlus,
  CircleX,
  Clock3,
  Code2,
  Copy,
  Database,
  Download,
  ExternalLink,
  Eye,
  File,
  FileArchive,
  FileCheck2,
  FileCode2,
  FileDown,
  FileImage,
  FileJson,
  FileSpreadsheet,
  FileText,
  FileType2,
  FileUp,
  Folder,
  FolderPlus,
  FolderOpen,
  GitFork,
  Github,
  Grid2X2,
  HardDrive,
  History,
  Image,
  Info,
  Layers,
  Library,
  LockKeyhole,
  LogOut,
  Mail,
  Minus,
  PanelLeft,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Search,
  Server,
  Settings,
  Table2,
  Trash2,
  Upload,
  Users,
  Wrench,
  X
} from 'lucide-vue-next'

const iconMap = {
  alert: AlertTriangle,
  arrowLeft: ArrowLeft,
  arrowRight: ArrowRight,
  book: BookOpen,
  bookMarked: BookMarked,
  box: Box,
  boxes: Boxes,
  check: Check,
  chevronDown: ChevronDown,
  chevronRight: ChevronRight,
  circleCheck: CircleCheck,
  circleHelp: CircleHelp,
  circlePlus: CirclePlus,
  circleX: CircleX,
  clock: Clock3,
  code: Code2,
  copy: Copy,
  database: Database,
  download: Download,
  external: ExternalLink,
  eye: Eye,
  file: File,
  fileArchive: FileArchive,
  fileCheck: FileCheck2,
  fileCode: FileCode2,
  fileDown: FileDown,
  fileImage: FileImage,
  fileJson: FileJson,
  fileSpreadsheet: FileSpreadsheet,
  fileText: FileText,
  fileType: FileType2,
  fileUp: FileUp,
  folder: Folder,
  folderPlus: FolderPlus,
  folderOpen: FolderOpen,
  fork: GitFork,
  github: Github,
  grid: Grid2X2,
  hardDrive: HardDrive,
  history: History,
  image: Image,
  info: Info,
  layers: Layers,
  library: Library,
  lock: LockKeyhole,
  logout: LogOut,
  mail: Mail,
  minus: Minus,
  panelLeft: PanelLeft,
  pencil: Pencil,
  play: Play,
  plus: Plus,
  refresh: RefreshCw,
  search: Search,
  server: Server,
  settings: Settings,
  table: Table2,
  trash: Trash2,
  upload: Upload,
  users: Users,
  wrench: Wrench,
  x: X
}

const props = defineProps({
  name: {
    type: String,
    required: true
  },
  size: {
    type: [Number, String],
    default: 16
  },
  strokeWidth: {
    type: [Number, String],
    default: 1.8
  }
})

const IconComponent = computed(() => iconMap[props.name] || File)
const numericSize = computed(() => Number(props.size) || 16)
const numericStrokeWidth = computed(() => Number(props.strokeWidth) || 1.8)
</script>

<style scoped>
.app-icon {
  display: block;
  flex: 0 0 auto;
  color: currentColor;
}
</style>
