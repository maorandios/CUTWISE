"""
Server-side PDF generation using Playwright.
Generates HTML that matches the current Cutting Plan PDF design.
"""

import asyncio
import sys
from playwright.sync_api import sync_playwright
from pathlib import Path
from typing import Dict, List, Any, Optional
import base64
import math
from concurrent.futures import ThreadPoolExecutor

class CuttingPlanPDFGenerator:
    """Generates Cutting Plan PDFs server-side using Playwright."""
    
    def __init__(self):
        self.page_width = 297  # A4 landscape width in mm
        self.page_height = 210  # A4 landscape height in mm
        
    def generate_pdf(
        self,
        nesting_report: Dict[str, Any],
        project_name: str,
        tolerance: float,
        tolerance_enabled: bool,
        trim: float,
        kerf: float,
        selected_profiles: List[str],
        icons: Dict[str, str],  # base64 encoded icons
        stockbar_svg_data: List[Dict[str, Any]] = None  # Extracted SVG polygon data from browser
    ) -> bytes:
        """Generate PDF from nesting report data."""
        
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page()
            
            # Generate HTML content
            html_content = self._generate_html(
                nesting_report=nesting_report,
                project_name=project_name,
                tolerance=tolerance,
                tolerance_enabled=tolerance_enabled,
                trim=trim,
                kerf=kerf,
                selected_profiles=selected_profiles,
                icons=icons,
                stockbar_svg_data=stockbar_svg_data
            )
            
            # Set content and wait for rendering
            page.set_content(html_content, wait_until='networkidle')
            
            # Generate PDF
            pdf_bytes = page.pdf(
                format='A4',
                landscape=True,
                print_background=True,
                margin={
                    'top': '0mm',
                    'right': '0mm',
                    'bottom': '0mm',
                    'left': '0mm'
                }
            )
            
            browser.close()
            return pdf_bytes
    
    def _generate_html(
        self,
        nesting_report: Dict[str, Any],
        project_name: str,
        tolerance: float,
        tolerance_enabled: bool,
        trim: float,
        kerf: float,
        selected_profiles: List[str],
        icons: Dict[str, str],
        stockbar_svg_data: List[Dict[str, Any]] = None
    ) -> str:
        """Generate HTML content that matches the React PDF design."""
        
        # Calculate totals for cover page
        totals = self._calculate_totals(nesting_report, selected_profiles)
        
        # Calculate total pages early for cover page
        profiles = [p for p in nesting_report.get('profiles', []) 
                   if p['profile_name'] in selected_profiles]
        total_stockbars = sum(len(p.get('cutting_patterns', [])) for p in profiles)
        total_pages = 1 + total_stockbars  # 1 cover + all stockbars
        
        # Generate cover page
        cover_page_html = self._generate_cover_page(
            project_name=project_name,
            totals=totals,
            total_pages=total_pages,
            tolerance=tolerance,
            tolerance_enabled=tolerance_enabled,
            trim=trim,
            kerf=kerf,
            icons=icons
        )
        
        # Generate cutting plan pages
        cutting_pages_html = ""
        page_num = 2  # Start from 2 (cover is page 1)
        
        for profile in profiles:
            profile_name = profile.get('profile_name', 'Unknown')
            cutting_patterns = profile.get('cutting_patterns', [])
            
            # Generate one page per stockbar
            for idx, pattern in enumerate(cutting_patterns):
                # Find matching SVG data for this stockbar
                svg_data = None
                if stockbar_svg_data:
                    for svg_item in stockbar_svg_data:
                        if svg_item.get('profileName') == profile_name and svg_item.get('patternIdx') == idx:
                            svg_data = svg_item.get('svgData')
                            break
                
                cutting_pages_html += self._generate_stockbar_page(
                    profile_name=profile_name,
                    pattern=pattern,
                    pattern_idx=idx,
                    project_name=project_name,
                    page_num=page_num,
                    total_pages=total_pages,
                    tolerance=tolerance,
                    tolerance_enabled=tolerance_enabled,
                    trim=trim,
                    kerf=kerf,
                    icons=icons,
                    svg_data=svg_data
                )
                page_num += 1
        
        # Combine everything
        html = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        
        @page {{
            size: A4 landscape;
            margin: 0;
        }}
        
        body {{
            font-family: 'Helvetica', 'Arial', sans-serif;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }}
        
        .page {{
            width: {self.page_width}mm;
            height: {self.page_height}mm;
            page-break-after: always;
            position: relative;
            background: white;
        }}
        
        .page:last-child {{
            page-break-after: auto;
        }}
        
        /* Footer styles */
        .footer {{
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            padding: 8px 40px;
            border-top: 1px solid #E5E7EB;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 9px;
            color: #6B7280;
        }}
        
        .footer-left {{
            display: flex;
            align-items: center;
        }}
        
        .footer-right {{
            display: flex;
            align-items: center;
            gap: 12px;
        }}
        
        .footer-dot {{
            color: #6B7280;
            margin: 0 6px;
        }}
        
        /* Cover page styles */
        .cover-logo-container {{
            padding: 40px 0;
            background-color: #F5F5F5;
            text-align: center;
            margin-bottom: 30px;
        }}
        
        .cover-info-section {{
            display: flex;
            justify-content: space-between;
            padding: 0 60px 10px;
        }}
        
        .cover-info-column {{
            flex: 1;
        }}
        
        .cover-info-row {{
            display: flex;
            align-items: center;
            margin-bottom: 10px;
        }}
        
        .cover-icon {{
            width: 16px;
            height: 16px;
            margin-right: 10px;
        }}
        
        .cover-label {{
            font-size: 9px;
            color: #6B7280;
            width: 100px;
            font-weight: 600;
        }}
        
        .cover-value {{
            font-size: 9px;
            color: #000;
            font-weight: 400;
        }}
        
        .cover-divider {{
            height: 1px;
            background: #E5E7EB;
            margin: 20px 40px;
        }}
        
        .cover-settings-section {{
            padding: 0 60px;
        }}
        
        .cover-settings-title {{
            font-size: 11px;
            font-weight: 600;
            color: #000;
            margin-bottom: 12px;
        }}
        
        /* Cutting plan page styles */
        .cutting-content {{
            padding: 40px;
            padding-bottom: 40px;
        }}
        
        .profile-title {{
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 20px;
            color: #000;
        }}
        
        .stockbar-section {{
            margin-bottom: 20px;
        }}
        
        .stockbar-title {{
            font-size: 14px;
            font-weight: 500;
            color: #6B7280;
            margin-bottom: 10px;
        }}
        
        .stockbar-info {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
        }}
        
        .info-boxes {{
            display: flex;
            gap: 0;
        }}
        
        .info-box {{
            display: inline-flex;
            align-items: center;
            padding: 4px 12px;
            border: 1px solid #E5E7EB;
            background: rgba(250, 250, 250, 0.2);
            font-size: 12px;
            font-weight: 500;
        }}
        
        .info-box:first-child {{
            border-radius: 8px 0 0 8px;
        }}
        
        .info-box:last-child {{
            border-radius: 0 8px 8px 0;
        }}
        
        .info-box:not(:last-child) {{
            border-right: none;
        }}
        
        .info-icon {{
            width: 16px;
            height: 16px;
            margin-right: 6px;
            position: relative;
            top: 1px;
        }}
        
        .info-text {{
            position: relative;
            top: -8px;
        }}
        
        .divider {{
            width: 1px;
            height: 16px;
            background: #E5E7EB;
            margin: 0 12px;
        }}
        
        .waste-box {{
            padding: 4px 12px;
            border: 1px solid #E5E7EB;
            border-radius: 8px;
            background: rgba(250, 250, 250, 0.2);
            font-size: 12px;
            font-weight: 500;
            display: flex;
            align-items: center;
        }}
        
        .waste-box.good {{
            background: rgba(28, 185, 126, 0.12);
            border-color: rgba(0, 129, 122, 0.4);
            color: #00312F;
        }}
        
        .stockbar-visual {{
            margin: 12px 0;
            height: 60px;
            border: 1px solid #D1D5DB;
            border-radius: 4px;
            position: relative;
            background: white;
        }}
        
        .cutting-table {{
            width: 65%;
            margin-top: 12px;
            border-collapse: collapse;
            font-size: 12px;
        }}
        
        .cutting-table thead tr {{
            background: rgba(156, 163, 175, 0.6);
        }}
        
        .cutting-table th {{
            padding: 6px 8px;
            text-align: left;
            font-weight: 600;
            color: #374151;
            border-bottom: 1px solid #D1D5DB;
        }}
        
        .cutting-table td {{
            padding: 6px 8px;
            border-bottom: 1px solid #E5E7EB;
            position: relative;
            top: -7px;
        }}
        
        .cutting-table tbody tr:last-child td {{
            border-bottom: none;
        }}
    </style>
</head>
<body>
{cover_page_html}
{cutting_pages_html}
</body>
</html>
"""
        return html
    
    def _calculate_totals(self, nesting_report: Dict[str, Any], selected_profiles: List[str]) -> Dict[str, Any]:
        """Calculate totals for cover page."""
        profiles = [p for p in nesting_report.get('profiles', []) 
                   if p['profile_name'] in selected_profiles]
        
        total_weight = sum(p.get('total_weight', 0) for p in profiles)
        profile_types = len(profiles)
        total_cuts = sum(
            sum(max(0, len(pattern.get('parts', [])) - 1) 
                for pattern in p.get('cutting_patterns', []))
            for p in profiles
        )
        
        return {
            'weight': total_weight / 1000,  # Convert to tonnes
            'profile_types': profile_types,
            'cuts': total_cuts
        }
    
    def _generate_cover_page(
        self,
        project_name: str,
        totals: Dict[str, Any],
        total_pages: int,
        tolerance: float,
        tolerance_enabled: bool,
        trim: float,
        kerf: float,
        icons: Dict[str, str]
    ) -> str:
        """Generate cover page HTML."""
        
        # Get current date
        from datetime import datetime
        current_date = datetime.now().strftime("%d %b %Y")
        
        tolerance_row = f"""
            <div class="cover-info-row">
                <img src="data:image/svg+xml;base64,{icons.get('tolerance', '')}" class="cover-icon" />
                <span class="cover-label"><strong>Stockbar Tolerance:</strong></span>
                <span class="cover-value">{tolerance:.0f}mm</span>
            </div>
        """ if tolerance_enabled else ""
        
        return f"""
<div class="page">
    <div class="cover-logo-container">
        <img src="data:image/svg+xml;base64,{icons.get('logo_main', '')}" style="width: 280px; height: 98px;" />
    </div>
    
    <div class="cover-info-section">
        <div class="cover-info-column">
            <div class="cover-info-row">
                <img src="data:image/svg+xml;base64,{icons.get('project', '')}" class="cover-icon" />
                <span class="cover-label"><strong>Project Name:</strong></span>
                <span class="cover-value">{project_name}</span>
            </div>
            <div class="cover-info-row">
                <img src="data:image/svg+xml;base64,{icons.get('date', '')}" class="cover-icon" />
                <span class="cover-label"><strong>Date:</strong></span>
                <span class="cover-value">{current_date}</span>
            </div>
            <div class="cover-info-row">
                <img src="data:image/svg+xml;base64,{icons.get('weight', '')}" class="cover-icon" />
                <span class="cover-label"><strong>Weight:</strong></span>
                <span class="cover-value">{totals['weight']:.3f}t</span>
            </div>
        </div>
        
        <div class="cover-info-column">
            <div class="cover-info-row">
                <img src="data:image/svg+xml;base64,{icons.get('profile_types', '')}" class="cover-icon" />
                <span class="cover-label"><strong>Profile Types:</strong></span>
                <span class="cover-value">{totals['profile_types']}</span>
            </div>
            <div class="cover-info-row">
                <img src="data:image/svg+xml;base64,{icons.get('cuts', '')}" class="cover-icon" />
                <span class="cover-label"><strong>Cutting Quantity:</strong></span>
                <span class="cover-value">{totals['cuts']}</span>
            </div>
        </div>
    </div>
    
    <div class="cover-divider"></div>
    
    <div class="cover-settings-section">
        <div class="cover-settings-title">Nesting Settings</div>
        <div class="cover-info-section" style="padding: 0;">
            <div class="cover-info-column">
                {tolerance_row}
                <div class="cover-info-row">
                    <img src="data:image/svg+xml;base64,{icons.get('trim', '')}" class="cover-icon" />
                    <span class="cover-label"><strong>Manual Trim:</strong></span>
                    <span class="cover-value">{trim:.0f}mm</span>
                </div>
                <div class="cover-info-row">
                    <img src="data:image/svg+xml;base64,{icons.get('kerf', '')}" class="cover-icon" />
                    <span class="cover-label"><strong>Saw Kerf:</strong></span>
                    <span class="cover-value">{kerf:.0f}mm</span>
                </div>
            </div>
            <div class="cover-info-column"></div>
        </div>
    </div>
    
    <div class="footer">
        <div class="footer-left">
            <img src="data:image/svg+xml;base64,{icons.get('logo_small', '')}" style="width: 80px; height: 28px;" />
        </div>
        <div class="footer-right">
            <span><strong>Date:</strong> {current_date}</span>
            <span class="footer-dot">•</span>
            <span><strong>Project Name:</strong> {project_name}</span>
            <span class="footer-dot">•</span>
            <span><strong>Page:</strong> 01 of {total_pages:02d}</span>
        </div>
    </div>
</div>
"""
    
    def _generate_stockbar_page(
        self,
        profile_name: str,
        pattern: Dict[str, Any],
        pattern_idx: int,
        project_name: str,
        page_num: int,
        total_pages: int,
        tolerance: float,
        tolerance_enabled: bool,
        trim: float,
        kerf: float,
        icons: Dict[str, str],
        svg_data: Dict[str, Any] = None
    ) -> str:
        """Generate a cutting plan page for a single stockbar."""
        
        from datetime import datetime
        current_date = datetime.now().strftime("%d %b %Y")
        
        # Generate stockbar section
        stockbar_html = self._generate_stockbar_section(
            pattern=pattern,
            pattern_idx=pattern_idx,
            profile_name=profile_name,
            tolerance=tolerance,
            tolerance_enabled=tolerance_enabled,
            trim=trim,
            kerf=kerf,
            icons=icons,
            svg_data=svg_data
        )
        
        return f"""
<div class="page">
    <div class="cutting-content">
        <h2 class="profile-title">{profile_name}</h2>
        {stockbar_html}
    </div>
    
    <div class="footer">
        <div class="footer-left">
            <img src="data:image/svg+xml;base64,{icons.get('logo_small', '')}" style="width: 80px; height: 28px;" />
        </div>
        <div class="footer-right">
            <span><strong>Date:</strong> {current_date}</span>
            <span class="footer-dot">•</span>
            <span><strong>Project Name:</strong> {project_name}</span>
            <span class="footer-dot">•</span>
            <span><strong>Page:</strong> {page_num:02d} of {total_pages:02d}</span>
        </div>
    </div>
</div>
"""
    
    def _generate_stockbar_section(
        self,
        pattern: Dict[str, Any],
        pattern_idx: int,
        profile_name: str,
        tolerance: float,
        tolerance_enabled: bool,
        trim: float,
        kerf: float,
        icons: Dict[str, str],
        svg_data: Dict[str, Any] = None
    ) -> str:
        """Generate HTML for a single stockbar section."""
        
        stock_length = pattern.get('stock_length', 0)
        waste = pattern.get('waste', 0)
        waste_percentage = pattern.get('waste_percentage', 0)
        parts = pattern.get('parts', [])
        
        # Tolerance row
        tolerance_html = ""
        if tolerance_enabled:
            tolerance_html = f"""
                <div class="info-box">
                    <img src="data:image/svg+xml;base64,{icons.get('tolerance_section', '')}" class="info-icon" />
                    <span class="info-text">{tolerance:.0f}mm</span>
                </div>
                <div class="divider"></div>
            """
        
        # Waste box styling
        waste_class = "waste-box good" if waste_percentage <= 20 else "waste-box"
        
        # Generate SVG visualization using extracted data from browser
        svg_html = self._generate_stockbar_svg(
            pattern=pattern,
            stock_length=stock_length,
            parts=parts,
            svg_data=svg_data
        )
        
        # Generate cutting table
        table_html = self._generate_cutting_table(
            parts=parts,
            profile_name=profile_name
        )
        
        return f"""
<div class="stockbar-section">
    <div class="stockbar-title">Stockbar {pattern_idx + 1}</div>
    
    <div class="stockbar-info">
        <div class="info-boxes">
            <div class="info-box">
                <img src="data:image/svg+xml;base64,{icons.get('length', '')}" class="info-icon" />
                <span class="info-text">{stock_length:,.0f}mm</span>
            </div>
            <div class="divider"></div>
            {tolerance_html}
            <div class="info-box">
                <img src="data:image/svg+xml;base64,{icons.get('trim', '')}" class="info-icon" />
                <span class="info-text">{trim:.0f}mm</span>
            </div>
            <div class="divider"></div>
            <div class="info-box">
                <img src="data:image/svg+xml;base64,{icons.get('kerf', '')}" class="info-icon" />
                <span class="info-text">{kerf:.0f}mm</span>
            </div>
        </div>
        
        <div class="{waste_class}">
            <img src="data:image/svg+xml;base64,{icons.get('waste', '')}" class="info-icon" />
            <span class="info-text">{waste:,.0f}mm ({waste_percentage:.2f}%)</span>
        </div>
    </div>
    
    <div class="stockbar-visual">
        {svg_html}
    </div>
    
    {table_html}
</div>
"""
    
    def _generate_stockbar_svg(
        self,
        pattern: Dict[str, Any],
        stock_length: float,
        parts: List[Dict[str, Any]],
        svg_data: Dict[str, Any] = None
    ) -> str:
        """Generate SVG visualization of stockbar with parts using extracted browser SVG data."""
        
        # If we have extracted SVG data from browser, use it directly!
        if svg_data and svg_data.get('parts'):
            view_box = svg_data.get('viewBox', '0 0 1000 60')
            svg_parts = []
            
            for part_data in svg_data['parts']:
                points = part_data.get('points', '')
                fill = part_data.get('fill', '#ccc')
                part_name = part_data.get('partName', '')
                
                # Render polygon exactly as it was in the browser
                svg_parts.append(f'<polygon points="{points}" fill="{fill}" stroke="#9ca3af" stroke-width="1" stroke-linejoin="miter" />')
                
                # Add label if part name exists
                if part_name and points:
                    # Calculate center of polygon for label placement
                    try:
                        coords = [float(x) for pair in points.split() for x in pair.split(',')]
                        if len(coords) >= 2:
                            # Average x coordinates for center
                            x_coords = [coords[i] for i in range(0, len(coords), 2)]
                            y_coords = [coords[i] for i in range(1, len(coords), 2)]
                            center_x = sum(x_coords) / len(x_coords)
                            center_y = sum(y_coords) / len(y_coords)
                            svg_parts.append(f'<text x="{center_x}" y="{center_y + 4}" text-anchor="middle" font-size="10" fill="#000">{part_name[:10]}</text>')
                    except:
                        pass
            
            svg_content = ''.join(svg_parts)
            return f'<svg width="100%" height="100%" viewBox="{view_box}" preserveAspectRatio="none">{svg_content}</svg>'
        
        # Fallback: if no SVG data provided, show error
        return '<svg width="100%" height="100%" viewBox="0 0 1000 60"><text x="500" y="30" text-anchor="middle" fill="#666">No SVG data available</text></svg>'
    
    def _generate_cutting_table(
        self,
        parts: List[Dict[str, Any]],
        profile_name: str
    ) -> str:
        """Generate cutting list table."""
        
        # Group parts by name
        part_groups = {}
        for part in parts:
            part_data = part.get('part', {})
            part_name = part_data.get('reference') or part_data.get('element_name') or 'Unknown'
            part_length = part.get('length', 0)
            start_angle = part_data.get('start_angle')
            end_angle = part_data.get('end_angle')
            
            if part_name in part_groups:
                part_groups[part_name]['count'] += 1
            else:
                part_groups[part_name] = {
                    'name': part_name,
                    'length': part_length,
                    'count': 1,
                    'start_angle': start_angle,
                    'end_angle': end_angle
                }
        
        # Sort by length descending
        sorted_groups = sorted(part_groups.values(), key=lambda x: x['length'], reverse=True)
        
        # Generate table rows
        rows_html = ""
        for idx, group in enumerate(sorted_groups):
            start_angle_str = self._format_angle(group['start_angle'])
            end_angle_str = self._format_angle(group['end_angle'])
            
            rows_html += f"""
                <tr>
                    <td>{idx + 1}</td>
                    <td>{profile_name}</td>
                    <td>{group['name']}</td>
                    <td>{group['length']:.0f}</td>
                    <td>{group['count']}</td>
                    <td>{start_angle_str}</td>
                    <td>{end_angle_str}</td>
                </tr>
            """
        
        return f"""
<table class="cutting-table">
    <thead>
        <tr>
            <th style="width: 6%;">#</th>
            <th style="width: 24%;">Profile Name</th>
            <th style="width: 14%;">Part Name</th>
            <th style="width: 14%;">Length (mm)</th>
            <th style="width: 14%;">Quantity</th>
            <th style="width: 14%;">Start Angle</th>
            <th style="width: 14%;">End Angle</th>
        </tr>
    </thead>
    <tbody>
        {rows_html}
    </tbody>
</table>
"""
    
    def _format_angle(self, angle: Any) -> str:
        """Format angle for display."""
        if angle is None or angle == '':
            return '90.0°'
        
        try:
            if isinstance(angle, (int, float)):
                return f'{float(angle):.1f}°'
            elif isinstance(angle, str):
                # Extract number from string
                import re
                match = re.search(r'-?\d+(?:\.\d+)?', angle)
                if match:
                    return f'{float(match.group()):.1f}°'
        except:
            pass
        
        return '90.0°'
