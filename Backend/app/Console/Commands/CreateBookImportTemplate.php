<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;

class CreateBookImportTemplate extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'books:create-import-template';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Create an Excel template for importing books';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Creating book import template...');

        try {
            // Increase memory limit temporarily
            $currentMemoryLimit = ini_get('memory_limit');
            ini_set('memory_limit', '256M');
            
            // Clean up any existing file to avoid issues
            $filePath = storage_path('app/templates/book_import_template.xlsx');
            if (file_exists($filePath)) {
                @unlink($filePath);
                $this->info("Removed existing template file");
            }
            
            // Create new Spreadsheet object
            $spreadsheet = new Spreadsheet();
            
            // Get the active sheet
            $sheet = $spreadsheet->getActiveSheet();
            $sheet->setTitle('Book Import');

            // Define headers
            $headers = ['Title', 'ISBN', 'Authors', 'Description', 'Categories', 'Price', 'Image_URL'];
            $sheet->fromArray($headers, null, 'A1');

            // Format headers
            $headerStyle = [
                'font' => [
                    'bold' => true,
                    'color' => ['rgb' => 'FFFFFF'],
                    'size' => 12,
                ],
                'fill' => [
                    'fillType' => Fill::FILL_SOLID,
                    'startColor' => ['rgb' => '2C3E50'],
                ],
                'alignment' => [
                    'horizontal' => Alignment::HORIZONTAL_CENTER,
                    'vertical' => Alignment::VERTICAL_CENTER,
                ],
                'borders' => [
                    'allBorders' => [
                        'borderStyle' => Border::BORDER_THIN,
                        'color' => ['rgb' => 'BDC3C7'],
                    ],
                ],
            ];
            $sheet->getStyle('A1:G1')->applyFromArray($headerStyle);

            // Set column widths
            $sheet->getColumnDimension('A')->setWidth(40); // Title
            $sheet->getColumnDimension('B')->setWidth(20); // ISBN
            $sheet->getColumnDimension('C')->setWidth(40); // Authors
            $sheet->getColumnDimension('D')->setWidth(50); // Description
            $sheet->getColumnDimension('E')->setWidth(30); // Categories
            $sheet->getColumnDimension('F')->setWidth(15); // Price
            $sheet->getColumnDimension('G')->setWidth(40); // Image URL

            // Create Instructions sheet
            $instructionSheet = $spreadsheet->createSheet();
            $instructionSheet->setTitle('Instructions & Sample');

            // Add sample data first
            $instructions = [
                ['Title', 'ISBN', 'Authors', 'Description', 'Categories', 'Price', 'Image_URL'],
                ['The Great Gatsby', '9780743273565', 'F. Scott Fitzgerald', 'A story of decadence and excess', 'Fiction, Classics', '9.99', 'https://example.com/gatsby.jpg'],
                ['Clean Code', '9780132350884', 'Robert C. Martin', 'Guide to writing clean code', 'Programming, Software Development', '29.99', 'https://example.com/cleancode.jpg'],
                ['Harry Potter and the Sorcerer\'s Stone', '9780590353427', 'J.K. Rowling', 'The story of a young wizard', 'Fantasy, Young Adult', '14.99', 'https://example.com/harrypotter.jpg'],
                [''],
                [''],
                ['Instructions for Book Import'],
                [''],
                ['1. Use the "Book Import" sheet to enter your book data'],
                ['2. Required fields:'],
                ['   - Title: Book title (required)'],
                ['   - ISBN: Unique identifier (required)'],
                ['   - Authors: Comma-separated list of authors (required)'],
                ['3. Optional fields:'],
                ['   - Description: Book description'],
                ['   - Categories: Comma-separated list of categories'],
                ['   - Price: Book price (numeric value)'],
                ['   - Image_URL: URL to book cover image'],
                [''],
                ['Notes:'],
                ['- Multiple authors should be separated by commas (e.g., "Author One, Author Two")'],
                ['- Multiple categories should be separated by commas (e.g., "Fiction, Mystery, Thriller")'],
                ['- Price should be a numeric value without currency symbols'],
                ['- Image URL should be a valid web URL to the book cover image']
            ];

            $instructionSheet->fromArray($instructions, null, 'A1');

            // Style the header row (first row) with background color
            $headerStyle = [
                'font' => [
                    'bold' => true,
                    'color' => ['rgb' => 'FFFFFF'],
                    'size' => 12,
                ],
                'fill' => [
                    'fillType' => Fill::FILL_SOLID,
                    'startColor' => ['rgb' => '2C3E50'],
                ],
                'alignment' => [
                    'horizontal' => Alignment::HORIZONTAL_CENTER,
                    'vertical' => Alignment::VERTICAL_CENTER,
                ],
                'borders' => [
                    'allBorders' => [
                        'borderStyle' => Border::BORDER_THIN,
                        'color' => ['rgb' => 'BDC3C7'],
                    ],
                ],
            ];
            $instructionSheet->getStyle('A1:G1')->applyFromArray($headerStyle);
            
            // Style the instruction heading
            $instructionSheet->getStyle('A7')->getFont()->setBold(true)->setSize(14);
            
            // Set column widths for instruction sheet
            foreach (range('A', 'G') as $column) {
                $instructionSheet->getColumnDimension($column)->setAutoSize(true);
            }

            // Add light gray background to the sample data rows
            $sampleDataStyle = [
                'fill' => [
                    'fillType' => Fill::FILL_SOLID,
                    'startColor' => ['rgb' => 'F5F5F5'],
                ],
            ];
            $instructionSheet->getStyle('A2:G4')->applyFromArray($sampleDataStyle);

            // Set the first sheet as active
            $spreadsheet->setActiveSheetIndex(0);

            // Create the Excel file
            $writer = new Xlsx($spreadsheet);

            // Ensure the directory exists with proper permissions
            $templateDir = storage_path('app/templates');
            if (!file_exists($templateDir)) {
                if (!mkdir($templateDir, 0777, true)) {
                    throw new \Exception("Failed to create directory: {$templateDir}");
                }
                chmod($templateDir, 0777); // Ensure directory is writable
                $this->info("Created directory: {$templateDir}");
            }

            // Check if directory is writable
            if (!is_writable($templateDir)) {
                chmod($templateDir, 0777);
                if (!is_writable($templateDir)) {
                    throw new \Exception("Directory is not writable: {$templateDir}");
                }
                $this->info("Updated permissions for directory: {$templateDir}");
            }

            // Save the file with options to optimize memory use
            $writer->setPreCalculateFormulas(false);
            $writer->save($filePath);

            // Check if the file was created successfully
            if (!file_exists($filePath)) {
                throw new \Exception("Failed to create template file at: {$filePath}");
            }
            
            // Ensure file permissions allow reading
            chmod($filePath, 0666);

            // Restore original memory limit
            ini_set('memory_limit', $currentMemoryLimit);

            $this->info('Template created successfully: ' . $filePath);
            
            return Command::SUCCESS;
        } catch (\Exception $e) {
            $this->error('Failed to create template: ' . $e->getMessage());
            \Log::error('Template creation failed: ' . $e->getMessage());
            
            // Clean up any partial file
            if (isset($filePath) && file_exists($filePath)) {
                @unlink($filePath);
                $this->info("Cleaned up partial template file");
            }
            
            // Restore original memory limit if set
            if (isset($currentMemoryLimit)) {
                ini_set('memory_limit', $currentMemoryLimit);
            }
            
            return Command::FAILURE;
        }
    }
} 