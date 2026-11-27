// Extrae el texto de un PDF con PDFKit (solo lectura). Uso: swift pdftexto.swift archivo.pdf > salida.txt
import Foundation
import PDFKit
let ruta = CommandLine.arguments[1]
guard let doc = PDFDocument(url: URL(fileURLWithPath: ruta)) else { print("NO_ABRE"); exit(1) }
print("PAGINAS=\(doc.pageCount)")
for i in 0..<doc.pageCount { if let p = doc.page(at: i), let t = p.string { print("--- pág \(i+1)"); print(t) } }
