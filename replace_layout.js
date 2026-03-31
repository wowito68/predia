const fs = require('fs');
const glob = require('glob'); // npm script, wait I'll use simple recursive readdir
const path = require('path');

function findFiles(dir, filter, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      findFiles(filePath, filter, fileList);
    } else if (filter.test(filePath)) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const files = findFiles('./app', /\.tsx$/);

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('MedicalHeader')) {
    // Replace import
    content = content.replace(/import\s+\{\s*MedicalHeader\s*\}\s+from\s+["']@\/components\/medical-header["'];?/g, 'import { DashboardLayout } from "@/components/dashboard-layout";');
    
    // Replace <div className="min-h-screen bg-background">\n <MedicalHeader />
    // or variations thereof
    content = content.replace(/<div\s+className=["'][^"']*min-h-screen[^"']*["']>\s*<MedicalHeader\s*\/>/g, '<DashboardLayout>');
    content = content.replace(/<div\s+className=["'][^"']*min-h-screen[^"']*["']>\s*\{.*\s*<MedicalHeader\s*\/>/g, '<DashboardLayout>\n{'); // handles dynamic {medicalheader} ??
    
    // There are some places that might have just <MedicalHeader />
    content = content.replace(/<MedicalHeader\s*\/>/g, '');
    
    // We need to replace the closing </div> of that container, which is hard with regex.
    // Let's replace </main>\n\s*</div> with </main>\n</DashboardLayout> or similar.
    content = content.replace(/<\/main>\s*<\/div>/g, '</main>\n    </DashboardLayout>');
    content = content.replace(/<\/div>\s*<\/div>\s*$/g, '</div>\n    </DashboardLayout>\n'); // for edge cases
    
    // If it doesn't match perfectly, it's ok, TS compiler will complain and I'll adapt.
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
});
