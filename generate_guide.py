from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, ListFlowable, ListItem
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor

def create_pdf():
    doc = SimpleDocTemplate("BizPilot_User_Guide.pdf", pagesize=letter)
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'TitleStyle', parent=styles['Heading1'], fontSize=24, spaceAfter=20, textColor=HexColor('#4f46e5')
    )
    heading_style = ParagraphStyle(
        'HeadingStyle', parent=styles['Heading2'], fontSize=16, spaceBefore=15, spaceAfter=10, textColor=HexColor('#1f2937')
    )
    normal_style = ParagraphStyle(
        'NormalStyle', parent=styles['Normal'], fontSize=11, spaceAfter=10, leading=16
    )
    
    story = []
    
    story.append(Paragraph("BizPilot AI - Complete User Guide", title_style))
    story.append(Paragraph("A beginner-friendly guide to understanding and using the platform.", normal_style))
    story.append(Spacer(1, 20))
    
    story.append(Paragraph("1. What is BizPilot AI? (The Core Concept)", heading_style))
    story.append(Paragraph("Imagine you are a freelancer. You do the actual work (coding, designing, writing), but you ALSO have to be the accountant, the lawyer, the manager, and the debt collector. It is exhausting.", normal_style))
    story.append(Paragraph("BizPilot AI is your digital 'Smart Manager'. It handles all the boring, scary, and repetitive business tasks using Artificial Intelligence, so you can focus on doing your actual work.", normal_style))
    
    story.append(Paragraph("2. The First-Time User Journey (Step-by-Step)", heading_style))
    
    story.append(Paragraph("Step A: The Dashboard (Your Command Center)", styles['Heading3']))
    story.append(Paragraph("When you log in for the first time, you land on the Dashboard. This is your command center. Instead of making you search for what's wrong, the 'Smart Alerts' section instantly tells you what needs your attention. For example: 'Client X has an overdue invoice' or 'You are working too much, high burnout risk.'", normal_style))
    
    story.append(Paragraph("Step B: Adding a Client", styles['Heading3']))
    story.append(Paragraph("You go to the 'Clients' tab and add a new client. But BizPilot doesn't just save their name. Over time, it builds a 'Client 360' profile. It gives every client a Health Score (Green, Yellow, or Red). If a client pays late, argues a lot, or changes project requirements (scope drift), their score turns Red, warning you to be careful.", normal_style))
    
    story.append(Paragraph("Step C: Getting Paid (Invoices)", styles['Heading3']))
    story.append(Paragraph("You finish a project and want to get paid. Instead of opening Excel, you go to Invoices and use the Voice-to-Invoice feature. You just speak to your computer: 'Create a 50,000 rupee invoice for John for web design.' The AI understands your voice, calculates GST automatically, and creates a professional PDF. If John forgets to pay, BizPilot sends him a polite WhatsApp reminder.", normal_style))
    
    story.append(Paragraph("Step D: Staying Safe (Contracts)", styles['Heading3']))
    story.append(Paragraph("Before starting a big project, you need a contract. BizPilot can generate one for you. But what if the client sends YOU a 20-page legal contract? You upload it to the 'Contract Risk Analyzer'. The AI reads the whole thing in seconds and highlights hidden traps (like 'you won't get paid if...').", normal_style))
    
    story.append(Paragraph("Step E: Handling Tough Conversations", styles['Heading3']))
    story.append(Paragraph("A client asks for a huge discount. You are nervous. You go to the 'Negotiation Simulator'. You practice your response with an AI that acts exactly like your client. The AI coach gives you a grade and tells you how to improve your negotiation skills.", normal_style))
    
    story.append(Paragraph("Step F: Tracking Your Future (Analytics)", styles['Heading3']))
    story.append(Paragraph("Finally, you check your business health. The 'Seasonal Planner' tells you that you usually make less money in December, so you should save up now. The 'Tax Calculator' tells you exactly how much Indian tax you owe (Section 44ADA, GST, etc.) so there are no surprises at the end of the year.", normal_style))
    
    story.append(Paragraph("3. Summary for Presentations", heading_style))
    story.append(Paragraph("If you are presenting this project, just tell people: 'BizPilot AI is an all-in-one operating system for freelancers. It connects 15 different AI features—from voice invoicing to legal contract analysis—into one seamless flow where data from one feature automatically helps the others.'", normal_style))
    
    doc.build(story)

try:
    create_pdf()
    print("PDF generated successfully.")
except Exception as e:
    print(f"Error generating PDF: {e}")
