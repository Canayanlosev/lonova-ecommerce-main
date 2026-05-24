'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { User, Settings, Package, Heart, MapPin, Lock } from 'lucide-react'

const TABS = [
  { href: '/hesabim',           icon: User,     label: 'Genel Bakış',    exact: true },
  { href: '/hesabim/profil',    icon: Settings, label: 'Profilim' },
  { href: '/hesabim/siparisler',icon: Package,  label: 'Siparişlerim' },
  { href: '/hesabim/favoriler', icon: Heart,    label: 'Favorilerim' },
  { href: '/hesabim/adresler',  icon: MapPin,   label: 'Adreslerim' },
  { href: '/hesabim/sifre',     icon: Lock,     label: 'Şifre Değiştir' },
]

interface Props {
  /** Optional header content rendered above the tab bar (title, profile info…) */
  header?: React.ReactNode
}

export function AccountTabs({ header }: Props) {
  const pathname = usePathname()

  return (
    <>
      {header && (
        <div className="mb-6">
          {header}
        </div>
      )}
      <div className="flex gap-1 mb-8 border-b border-border overflow-x-auto">
        {TABS.map(({ href, icon: Icon, label, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap shrink-0 ${
                active
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-400 hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          )
        })}
      </div>
    </>
  )
}
