import asyncio
from pdf_generator import CuttingPlanPDFGenerator

async def test():
    generator = CuttingPlanPDFGenerator()
    
    # Test data
    nesting_report = {
        'profiles': []
    }
    
    try:
        pdf_bytes = await generator.generate_pdf(
            nesting_report=nesting_report,
            project_name="Test",
            tolerance=0,
            tolerance_enabled=False,
            trim=0,
            kerf=0,
            selected_profiles=[],
            icons={}
        )
        print(f"Success! Generated {len(pdf_bytes)} bytes")
    except Exception as e:
        print(f"Error: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test())
