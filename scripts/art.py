"""Draw the original low-resolution orchard, fruit sprites, and lettering (Pillow)."""
from pathlib import Path
import math
import random
from PIL import Image, ImageDraw, ImageFilter, ImageChops

OUT = Path(__file__).resolve().parents[1] / "assets"
OUT.mkdir(exist_ok=True)
INK = "#293348"
WHITE = "#fff4cb"
GREEN = "#31905b"

def sprite(name, paint):
    im = Image.new("RGBA", (48, 48))
    d = ImageDraw.Draw(im)
    paint(d)
    mask = im.getchannel("A").filter(ImageFilter.MaxFilter(3))
    framed = Image.new("RGBA", im.size, INK)
    framed.putalpha(mask)
    framed.alpha_composite(im)
    framed.save(OUT / (name + ".png"))
    return framed

def face(d, x, y, gap=10):
    for eye in (x, x+gap):
        d.rectangle((eye,y,eye+1,y+3), fill=INK)
        d.point((eye,y),fill=WHITE)
    d.line((x+4,y+4,x+gap-3,y+4),fill=INK)
    d.point((x+3,y+3),fill=INK)
    d.rectangle((x-3,y+4,x-1,y+5),fill="#ff8882")
    d.rectangle((x+gap+2,y+4,x+gap+4,y+5),fill="#ff8882")

def melon(d):
    shell=[(3,29),(6,23),(29,4),(33,5),(44,29),(44,33),(38,39),(31,42),(21,44),(12,42),(6,37)]
    d.polygon(shell,fill="#207553")
    d.line([(4,29),(8,35),(15,39),(22,40),(30,38),(38,34),(44,29)],fill="#64c765",width=4)
    d.line([(4,28),(9,33),(17,36),(25,36),(34,33),(42,27)],fill="#fbdf88",width=3)
    d.polygon([(5,28),(29,5),(32,6),(41,26),(36,30),(27,33),(19,34),(11,32)],fill="#f34c57")
    d.polygon([(5,28),(29,5),(32,6),(13,27),(11,30)],fill="#ff9987")
    d.polygon([(30,10),(33,14),(38,25),(33,28)],fill="#df3b4d")
    for x,y in [(14,24),(25,14),(30,10),(32,19),(24,29),(34,25),(12,29)]:
        d.rectangle((x,y,x+1,y+2), fill="#743b47")
    for x,y in [(13,39),(22,41),(33,38),(39,34)]:
        d.line((x,y,x+2,y-1), fill="#175e50",width=2)
    face(d,19,21,10)

def berry(d):
    d.polygon([(7,15),(13,10),(33,9),(40,15),(40,23),(36,30),(23,42),(19,42),(10,34),(5,23)], fill="#cb344b")
    d.polygon([(7,16),(13,12),(32,11),(37,16),(36,24),(30,31),(21,37),(14,34),(7,24)],fill="#f45057")
    d.polygon([(8,17),(15,13),(19,14),(12,20),(11,23),(8,23)],fill="#ff9a83")
    for x,y in [(11,24),(16,17),(25,17),(31,14),(32,23),(27,29),(20,33),(15,30),(35,20)]:
        d.line((x,y,x-1,y+2),fill="#ffe199",width=2)
    d.polygon([(6,10),(15,9),(13,5),(21,7),(26,3),(29,4),(27,9),(38,8),(34,12),(27,14),(28,18),(22,15),(16,18),(17,13),(11,14)],fill="#287553")
    d.line([(10,10),(19,10),(23,8),(25,5)],fill="#7cc95c",width=2)
    d.line((26,11,33,10),fill="#7cc95c",width=2)
    face(d,15,22,10)

def orange(d):
    d.ellipse((6,10,41,43),fill="#db7435")
    d.ellipse((6,10,38,39),fill="#ffa92d")
    d.arc((9,14,30,36),180,265,fill="#ffde75",width=3)
    d.rectangle((11,18,13,21),fill=WHITE)
    for x,y in [(31,32),(33,30),(28,35),(32,16),(13,31)]: d.point((x,y),fill="#e88c2e")
    d.line([(22,12),(25,6),(25,4)],fill="#67493a",width=3)
    d.polygon([(26,9),(29,4),(34,3),(40,3),(37,8),(32,10)],fill=GREEN)
    d.line((29,8,35,5),fill="#80bf5b")
    face(d,16,24)

def cherry(d):
    d.line([(13,29),(14,21),(23,13),(28,6),(29,5)],fill=INK,width=3)
    d.line([(34,31),(34,21),(31,13),(29,6)],fill=INK,width=3)
    d.line([(13,27),(16,20),(24,13),(28,7)],fill="#508744")
    d.polygon([(28,7),(24,3),(17,2),(12,4),(16,8),(23,10)],fill="#46945a")
    for x,y in [(4,23),(24,27)]:
        d.ellipse((x,y,x+18,y+16),fill="#b3334d")
        d.ellipse((x+1,y,x+15,y+13),fill="#ec475a")
        d.rectangle((x+4,y+3,x+6,y+4),fill="#ffd1ac")

def lemon(d):
    d.polygon([(4,28),(7,20),(17,11),(30,9),(37,6),(39,8),(39,13),(43,18),(41,27),(32,36),(19,39),(10,37),(6,38),(4,36)],fill="#d4942e")
    d.polygon([(5,28),(8,20),(18,12),(31,10),(37,7),(38,14),(41,19),(38,27),(27,34),(16,35),(7,33)],fill="#ffd747")
    d.line((10,23,18,16),fill="#fff3a0",width=3)
    face(d,17,21)

fruit = {n:sprite(n,fn) for n,fn in [('melon',melon),('berry',berry),('orange',orange),('cherry',cherry),('lemon',lemon)]}
glyphs = {
    "F": ["11111","11000","11000","11110","11000","11000","11000"],
    "R": ["11110","11011","11011","11110","11100","11010","11011"],
    "U": ["110011","110011","110011","110011","110011","110011","011110"],
    "I": ["1111","0110","0110","0110","0110","0110","1111"],
    "T": ["111111","001100","001100","001100","001100","001100","001100"],
    "C": ["011111","110000","110000","110000","110000","110000","011111"],
    "H": ["110011","110011","110011","111111","110011","110011","110011"],
    "O": ["011110","110011","110011","110011","110011","110011","011110"],
    "M": ["1100011","1110111","1111111","1101011","1100011","1100011","1100011"],
    "P": ["111110","110011","110011","111110","110000","110000","110000"],
    "!": ["11","11","11","11","11","00","11"]
}

def title():
    im = Image.new("RGBA", (180,80))
    for word, y, colors in [
        ("FRUIT",2,("#fff6a2","#ffda50","#efa436")),
        ("CHOMP!",39,("#ffb583","#ff8461","#ed5c58"))
    ]:
        mask = Image.new("L",im.size)
        d = ImageDraw.Draw(mask)
        x = 4
        for c in word:
            for i,row in enumerate(glyphs[c]):
                for j,v in enumerate(row):
                    if v == "1":
                        left = x+j*4+(6-i)//3
                        d.rectangle((left,y+i*4,left+3,y+i*4+3),fill=255)
            x += len(glyphs[c][0])*4+5
        outer = mask.filter(ImageFilter.MaxFilter(5))
        im.paste("#273549",(0,0),ImageChops.offset(outer,1,4))
        im.paste("#30384c",(0,0),outer)
        color = Image.new("RGBA",im.size,colors[1])
        cd = ImageDraw.Draw(color)
        cd.rectangle((0,y,179,y+5),fill=colors[0])
        cd.rectangle((0,y+23,179,y+28),fill=colors[2])
        im.paste(color,(0,0),mask)
    return im.crop(im.getbbox())

title().save(OUT/"title.png")

def orchard():
    rng=random.Random(43)
    W,H=640,274
    im=Image.new("RGB",(W,H),"#8fd6e9"); d=ImageDraw.Draw(im)
    for y in range(H):
        t=min(1,y/215)
        d.line((0,y,W,y), fill=tuple(round(a+(b-a)*t) for a,b in zip((123,202,231),(215,239,209))))
    def cloud(x,y,s):
        pts=[(0,12),(4,12),(4,8),(10,8),(10,4),(16,4),(16,1),(26,1),(26,3),(31,3),(31,7),(39,7),(39,10),(45,10),(45,14),(0,14)]
        for dy,col in [(2,"#b9e4e3"),(0,"#fff7dc")]:
            d.polygon([(x+a*s,y+b*s+dy) for a,b in pts],fill=col)
    for x,y,s in [(-5,30,1),(62,17,1),(172,31,2),(300,6,1),(378,41,1),(504,17,2),(604,65,1),(-16,91,2),(259,75,1)]: cloud(x,y,s)
    def ridge(y,amp,color,phase):
        pts=[]
        for x in range(-4,W+5,4):
            h=y+amp*(.61*math.sin(x/37+phase)+.55*math.sin(x/69+phase))
            pts.extend([(x,int(h)),(x+4,int(h))])
        d.polygon(pts+[(W,H),(0,H)],fill=color)
    for row in [(159,26,'#9accc0',2),(173,21,'#80c6a6',5),(185,19,'#65b795',4)]:ridge(*row)
    # An orchard extends into two rows towards the vanishing point.
    d.rectangle((0,197,W,H),fill="#9acb64")
    for y,c in [(202,'#b5d36c'),(213,'#b3d46a'),(232,'#8abe61')]: d.line((0,y,W,y),fill=c,width=2)
    d.polygon([(353,195),(362,195),(458,H),(238,H)],fill="#f3d99a")
    d.polygon([(353,195),(355,195),(290,H),(238,H)],fill="#e4c480")
    d.polygon([(361,195),(362,195),(458,H),(438,H)],fill="#dfbe7d")
    def tree(x,b,s):
        fg="#39895f"; mid="#50a459"; light="#7cba5c"
        def box(x1,y1,x2,y2,col): d.rectangle((x+int(x1*s),b+int(y1*s),x+int(x2*s),b+int(y2*s)),fill=col)
        box(-4,-15,3,0,"#786e47");box(0,-11,2,-1,"#b48d55")
        for dx,dy,r in [(-8,-18,9),(7,-19,10),(0,-26,12)]:
            for ox,oy,rad,col in [(0,1,r+1,fg),(-1,-1,r,mid),(-2,-4,r-3,light)]:
                cx,cy=dx+ox,dy+oy
                corners=[(-rad,-rad//2),(-rad//2,-rad),(rad//2,-rad),(rad,-rad//2),(rad,rad//2),(rad//2,rad),(-rad//2,rad),(-rad,rad//2)]
                d.polygon([(x+int((cx+a)*s),b+int((cy+q)*s)) for a,q in corners],fill=col)
        for a,q in [(-10,-22),(4,-16),(7,-28),(-3,-32)]:
            box(a,q,a+2,q+2,"#ef8854");box(a,q,a,q,"#ffe8a3")
    for side in [-1,1]:
        for i in range(11):
            k=i/10
            tree(356+side*int(15+325*k**1.5),198+int(35*k*k),.22+1.13*k*k)
    # Meadow, daisies and grass tufts frame the lower edge.
    for _ in range(600):
        x=rng.randrange(W);y=rng.randrange(204,H)
        if 353-(y-195)*1.5 < x < 362+(y-195)*1.25: continue
        d.line((x,y,x+rng.randint(1,4),y),fill=rng.choice(["#a8d16c","#c2d97b","#80b960"]))
    for x in range(0,W,4):
        top=int(255+17*math.sin(x/83)+rng.randrange(-3,3))
        d.rectangle((x,top,x+3,H),fill="#69a95b")
        d.line((x,top,x+3,top),fill="#87bf64",width=2)
    for _ in range(130):
        x=rng.randrange(W);y=rng.randrange(240,H)
        if y < 256+16*math.sin(x/83): continue
        d.line((x,y,x+1,y-2),fill="#458f55")
        if rng.random()<.24: d.rectangle((x,y-3,x+2,y-2),fill=rng.choice(["#fff2c1","#f9c259","#f5ac99"]))
    im.save(OUT/"orchard.png",optimize=True)
orchard()

for size in [180,192,512]:
    icon=Image.new("RGB",(64,64),"#ffe8a4")
    icon.paste(fruit["melon"],(8,7),fruit["melon"])
    icon.resize((size,size),Image.Resampling.NEAREST).save(OUT/f"icon-{size}.png")
