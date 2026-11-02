"""Build the portal's concise, linked English quick guide from reviewed UI images."""
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import ImageReader
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/lab/assets/portal-quick-guide.pdf'
IMG=ROOT/'docs/quick-guide-images'
URL='https://sdr-qa-lab-milton.milton98matus.chatgpt.site/'
W,H=A4; M=40; CW=W-2*M
NAVY='#0b1730'; INK='#132b49'; BLUE='#315f8e'; MUTED='#526b83'; LIME='#a6ce52'; PALE='#eaf1f9'
pdfmetrics.registerFont(TTFont('Portal','/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('PortalBold','/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))
pdfmetrics.registerFontFamily('Portal',normal='Portal',bold='PortalBold',italic='Portal',boldItalic='PortalBold')
c=canvas.Canvas(str(OUT),pagesize=A4)
c.setTitle('SDR Lab | Quick Start Guide');c.setAuthor('Milton Matus');c.setSubject('Private SDR onboarding, navigation and reporting')
def box(x,y,w,h,fill,r=10,stroke=None):
 c.setFillColor(colors.HexColor(fill));c.setStrokeColor(colors.HexColor(stroke or fill));c.roundRect(x,y,w,h,r,fill=1,stroke=bool(stroke))
def p(text,x,top,w,size=11.2,color=INK,bold=False,leading=None):
 style=ParagraphStyle('x',fontName='PortalBold' if bold else 'Portal',fontSize=size,leading=leading or size*1.45,textColor=colors.HexColor(color))
 ob=Paragraph(text,style);_,height=ob.wrap(w,900);ob.drawOn(c,x,top-height);return top-height
def button(text,x,y,w,hash='onboarding',fill=NAVY):
 box(x,y,w,29,fill,6);p(text,x+12,y+21,w-24,9.4,'#ffffff',True,12);c.linkURL(URL+'#'+hash,(x,y,x+w,y+29),relative=0,thickness=0)
def image(name,x,top,w,h,crop=None):
 path=IMG/(name+'.jpg');im=Image.open(path);iw,ih=im.size
 c.saveState();clip=c.beginPath();clip.roundRect(x,top-h,w,h,7);c.clipPath(clip,stroke=0,fill=0)
 if crop:
  cx,cy,cw,ch=crop;scale=min(w/cw,h/ch);dx=x+(w-cw*scale)/2;dy=top-h+(h-ch*scale)/2
  c.drawImage(str(path),dx-cx*scale,dy-(ih-cy-ch)*scale,width=iw*scale,height=ih*scale)
 else:c.drawImage(str(path),x,top-h,width=w,height=h,preserveAspectRatio=True,anchor='c')
 c.restoreState();c.setStrokeColor(colors.HexColor('#cbd9e8'));c.roundRect(x,top-h,w,h,7,stroke=1,fill=0)
def header(page,key,label):
 c.bookmarkPage(key);c.addOutlineEntry(label,key,0,False)
 c.setFillColor(colors.HexColor('#f4f7fb'));c.rect(0,0,W,H,fill=1,stroke=0)
 c.setFillColor(colors.HexColor(NAVY));c.rect(0,H-77,W,77,fill=1,stroke=0)
 c.drawImage(str(ROOT/'public/lab/assets/osr-official.png'),M,H-58,width=93,height=35,preserveAspectRatio=True,mask='auto')
 c.drawImage(str(ROOT/'public/lab/assets/qa-original-white.png'),W-M-43,H-53,width=43,height=29,preserveAspectRatio=True,mask='auto')
 p('SDR LAB  /  QUICK START',M+120,H-31,260,9.4,'#d2dfed',True)
 p('NOVEMBER 2026',M+120,H-48,260,8.1,'#adbfce')
 c.setStrokeColor(colors.HexColor('#d4dfec'));c.line(M,44,W-M,44)
 p('Created by Milton Matus  |  Private training resource',M,32,CW-40,7.5,MUTED)
 p(f'{page} / 5',W-M-32,32,32,7.5,MUTED)
 # Every page has an internal navigation row and PDF outline bookmarks.
 for i,(dest,title) in enumerate([('start','1 Start'),('profile','2 Profile'),('practice','3 Practice'),('admin','4 Admin'),('time','5 Time')]):
  x=M+i*(CW/5);p(title,x,H-88,CW/5,8.3,BLUE,True);c.linkRect('',dest,(x,H-105,x+CW/5-7,H-86),relative=0,thickness=0)
def title(eyebrow,text,lead):
 p(eyebrow,M,724,CW,9,BLUE,True)
 end=p(text,M,701,CW,29,INK,True,34)
 return p(lead,M,end-15,CW,11.2,MUTED,False,16)
def caption(text,top):p(text,M,top,CW,8.1,MUTED,False,11)

header(1,'start','Your first five minutes')
title('PURPOSE & SCOPE','Your first five minutes<br/>in SDR Lab.','Build MSP fluency, practice realistic outbound decisions and apply feedback. Your training record helps you and your administrator choose the next useful step.')
image('home',M,552,CW,350)
caption('Reviewed interface with fictional examples. Your assigned learning and personal progress will differ.',192)
for i,(n,t,b) in enumerate([('01','Learn','Understand a service and the business outcome.'),('02','Practice','Use evidence to choose a proportionate response.'),('03','Apply','Submit work, use feedback and try again.')]):
 x=M+i*(CW/3+4);ww=CW/3-8;box(x,92,ww,81,'#ffffff',8,'#d7e2ee');p(n,x+12,160,ww-24,8.5,BLUE,True);p(t,x+12,145,ww-24,13,INK,True);p(b,x+12,124,ww-24,8.8,MUTED,False,12)
button('Open the portal',M,55,139,'onboarding')
p('Start with Portal walkthrough in the header or the home card.',M+154,76,CW-154,9.1,MUTED)
c.showPage()

header(2,'profile','Set up your learning profile')
title('YOUR PROFILE','Make the portal yours.','Sign in using the account that was invited. Complete your profile on the first visit; use My profile in the header to update it later.')
image('profile',M+218,601,CW-218,382,crop=(349,20,650,880))
y=603
for num,heading,body in [('1','Use your real name','Enter your first and last name so your administrator can identify your learning record.'),('2','Select your MSP','Choose the MSP you work with. If it is missing, select Not assigned yet and ask your administrator to add it.'),('3','Save your profile','Your administrator confirms the profile and assignment. The signed-in account keeps your progress linked across devices.')]:
 box(M,y-24,24,24,PALE,6);p(num,M+8,y-5,15,10,BLUE,True);p(heading,M+35,y-1,168,12.2,INK,True);bottom=p(body,M+35,y-27,166,10.3,MUTED,False,15);y=min(y-120,bottom-24)
caption('Fictional account shown. Your profile does not replace the approved client brief.',206)
p('Where to go next',M,179,CW,13,INK,True)
for i,(a,b,hash) in enumerate([('Start here','Continue the next required activity.','onboarding'),('MSP Foundations','Explore services, outcomes and discovery.','foundations'),('Training record','Review submitted work and feedback.','training')]):
 yy=148-i*24;c.setStrokeColor(colors.HexColor('#d5e0ed'));c.line(M,yy-14,W-M,yy-14);p(a,M,yy+3,145,9.7,BLUE,True);p(b,M+157,yy+3,CW-157,9.7,MUTED);c.linkURL(URL+'#'+hash,(M,yy-14,W-M,yy+7),relative=0,thickness=0)
button('Open the walkthrough',M,55,175,'walkthrough')
c.showPage()

header(3,'practice','Practice with purpose')
title('DECISIONS & FEEDBACK','Practice with purpose.','Choose one activity for the skill you want to develop. Read the coaching, identify one adjustment and carry it into your next attempt.')
image('mission',M,603,CW,352)
caption('Find the Opportunity: a fictional mission using published scenario criteria, with three decisions per attempt.',240)
for x,heading,body,hash in [(M,'Call preparation','Use four concise prompts to prepare a question, a relevant benefit and a next step. Expand an example, then open its related practice.','guide'),(M+CW/2+12,'Call Lab','Follow a complete conversation. Listen for changing signals, choose the next move and record the outcome supported by the agreement.','calllab')]:
 ww=CW/2-12;p(heading,x,209,ww,15,INK,True);p(body,x,184,ww,10.3,MUTED,False,15);button('Open '+('playbook' if hash=='guide' else 'Call Lab'),x,88,151,hash)
box(M,55,CW,23,'#e6efd9',6);p('A professional exit can earn full points when the evidence calls for it.',M+11,72,CW-22,9.1,'#355525',True)
c.showPage()

header(4,'admin','Use administrator reporting')
title('ADMINISTRATORS','Guide the next useful step.','Open Reporting to see the executive summary. Filter by participant, MSP, date or topic, then open the evidence behind a coaching action.')
image('executive',M,605,CW,351)
caption('Fictional reporting example. Training and timing data remain subject to the participant permissions.',243)
p('Keep the responsibilities clear',M,215,CW,14,INK,True)
table=[('Trainee','Learning, practice, feedback and their own record.'),('Training admin','Team reporting, account assignments, coaching and readiness review.'),('Owner','Administrator roles, visitor access and technical site settings.')]
for i,(a,b) in enumerate(table):
 yy=189-i*33;box(M,yy-27,CW,31,'#ffffff' if i%2==0 else PALE,0);p(a,M+10,yy-3,113,9.6,INK,True);p(b,M+133,yy-3,CW-143,9.5,MUTED,False,13)
p('Confirm profiles. Review work. Open the supporting evidence.',M+172,76,CW-172,9.4,MUTED,False,13)
button('Open Reporting',M,51,152,'reporting')
c.showPage()

header(5,'time','Interpret portal time')
title('TIME & LEARNING EVIDENCE','Read time with context.','From Reporting, choose View record, then Portal time. Trainees can see their own timing in Training record. Select a date window before exporting.')
image('time',M,604,CW,328)
caption('Fictional timing example. Use daily CSV for the selected date window and session CSV for visits.',265)
items=[('Connected','Signed-in connection intervals observed by the portal.'),('Visible & focused','The portal was visible and had focus.'),('Recent interaction','An estimate that pauses after two minutes without input.')]
for i,(a,b) in enumerate(items):
 x=M+i*(CW/3+3);ww=CW/3-7;p(a,x,233,ww,11,INK,True);p(b,x,211,ww,9.8,MUTED,False,14)
box(M,124,CW,40,'#e9eff7',7);p('Reading can continue without input. These measures show observed portal use; assess learning through submitted work and coaching.',M+12,154,CW-24,9.4,MUTED,False,13)
p('Detail covers up to 90 days. All-time totals remain available. Module timing starts with this release; earlier section durations cannot be reconstructed.',M,116,CW,8.7,MUTED,False,12)
button('Open my training record',M,51,198,'training')
c.save();print(OUT)
