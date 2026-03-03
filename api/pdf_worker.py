"""
Standalone PDF generation worker that runs in a separate process.
This avoids event loop conflicts with FastAPI's asyncio.
"""
import sys
import json
import traceback

try:
    from pdf_generator import CuttingPlanPDFGenerator
    
    if __name__ == "__main__":
        # Read input from stdin
        input_data = json.loads(sys.stdin.read())
        
        # Generate PDF
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
            total_weight=input_data.get('totalWeight', 0)
        )
        
        # Write PDF bytes to stdout
        sys.stdout.buffer.write(pdf_bytes)
except Exception as e:
    # Write error to stderr
    error_msg = f"PDF Worker Error: {str(e)}\n{traceback.format_exc()}"
    sys.stderr.write(error_msg)
    sys.stderr.flush()
    sys.exit(1)
