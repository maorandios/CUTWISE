"""
Standalone PDF generation worker that runs in a separate process.
This avoids event loop conflicts with FastAPI's asyncio.
Handles both Cutting Plan and BOM PDF generation.
"""
import sys
import json
import traceback

try:
    # Read JSON file path from command line argument
    if len(sys.argv) < 2:
        raise Exception("Missing input file path")
    
    input_file = sys.argv[1]
    
    with open(input_file, 'r') as f:
        input_data = json.load(f)
    
    pdf_type = input_data.get('pdf_type', 'cutting_plan')
    
    if pdf_type == 'bom':
        # Generate BOM PDF
        from pdf_generator import BOMPDFGenerator
        generator = BOMPDFGenerator()
        pdf_bytes = generator.generate_pdf(
            nesting_report=input_data['nesting_report'],
            report=input_data['report'],
            project_name=input_data['project_name'],
            company_details=input_data['company_details'],
            icons=input_data['icons']
        )
    else:
        # Generate Cutting Plan PDF (default)
        from pdf_generator import CuttingPlanPDFGenerator
        generator = CuttingPlanPDFGenerator()
        pdf_bytes = generator.generate_pdf(
            nesting_report=input_data['nestingReport'],
            project_name=input_data['projectName'],
            tolerance=input_data['tolerance'],
            tolerance_enabled=input_data['toleranceEnabled'],
            trim=input_data['trim'],
            kerf=input_data['kerf'],
            selected_profiles=input_data['selectedProfiles'],
            icons=input_data['icons'],
            stockbar_svg_data=input_data.get('stockbarSvgData', []),
            total_weight=input_data.get('totalWeight', 0),
            company_details=input_data.get('companyDetails', {})
        )
    
    # Write PDF to file
    output_file = input_file.replace('.json', '.pdf')
    with open(output_file, 'wb') as f:
        f.write(pdf_bytes)
        
except Exception as e:
    # Write error to stderr
    error_msg = f"PDF Worker Error: {str(e)}\n{traceback.format_exc()}"
    print(error_msg, file=sys.stderr)
    sys.exit(1)
