"use client"

import React from 'react'
import dynamic from 'next/dynamic'
import { Button } from "@/components/ui/button"
import { Download, Loader2 } from "lucide-react"

// Import PDFDownloadLink dynamically to avoid Next.js SSR issues
const PDFDownloadLink = dynamic(
  () => import('@react-pdf/renderer').then(mod => mod.PDFDownloadLink),
  { 
      ssr: false, 
      loading: () => (
          <Button variant="outline" size="sm" disabled className="text-blue-600 border-blue-200 bg-blue-50/50">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Preparando PDF...
          </Button>
      ) 
  }
)

interface PDFButtonProps {
    document: any;
    fileName: string;
    variant?: any;
    size?: any;
    className?: string;
    children?: React.ReactNode;
}

export function PDFDownloadButton({ document, fileName, variant = "outline", size = "sm", className = "", children }: PDFButtonProps) {
    return (
        <PDFDownloadLink document={document} fileName={fileName}>
            {({ blob, url, loading, error }) => (
                <Button 
                    variant={variant} 
                    size={size} 
                    className={className} 
                    disabled={loading}
                >
                    {loading ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generando PDF...</>
                    ) : (
                        children || <><Download className="w-4 h-4 mr-2" /> Descargar PDF</>
                    )}
                </Button>
            )}
        </PDFDownloadLink>
    )
}
