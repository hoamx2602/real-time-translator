import { useState } from 'react'
import { Save, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (title: string, subject: string) => Promise<void>
  onDelete: () => void
  defaultTitle?: string
  defaultSubject?: string
  saving?: boolean
}

export function SaveModal({
  open,
  onOpenChange,
  onSave,
  onDelete,
  defaultTitle = '',
  defaultSubject = '',
  saving = false,
}: Props) {
  const [title, setTitle] = useState(defaultTitle)
  const [subject, setSubject] = useState(defaultSubject)

  const handleSave = async () => {
    await onSave(title, subject)
    onOpenChange(false)
    // Reset form
    setTitle('')
    setSubject('')
  }

  const handleDelete = () => {
    onDelete()
    onOpenChange(false)
    // Reset form
    setTitle('')
    setSubject('')
  }

  const handleClose = () => {
    onOpenChange(false)
    // Reset form
    setTitle('')
    setSubject('')
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Save Recording</DialogTitle>
          <DialogDescription>
            Enter a title and optional subject for this recording, or delete it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Lecture 1"
              autoFocus
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Subject (optional)</label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., CS101"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={saving}
              className="flex-1"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !title.trim()}
              className="flex-1"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

