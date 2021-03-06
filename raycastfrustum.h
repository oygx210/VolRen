#ifndef RAYCASTFRUSTUM_H
#define RAYCASTFRUSTUM_H

#include <memory>
#include <QMatrix4x4>
#include <QtOpenGL>
#include <painter.h>

namespace yy {
namespace volren {

class IRaycastFrustum
{
public:
    virtual int texWidth() const = 0;
    virtual int texHeight() const = 0;
    virtual int volWidth() const = 0;
    virtual int volHeight() const = 0;
    virtual int volDepth() const = 0;
    virtual QMatrix4x4 matModel() const = 0;
    virtual QMatrix4x4 matView() const = 0;
    virtual QMatrix4x4 matProj() const = 0;

    virtual void setTexSize(int w, int h) = 0;
    virtual void setVolSize(int w, int h, int d) = 0;
    virtual void setMatView(const QMatrix4x4& matView) = 0;
    virtual void setMatProj(const QMatrix4x4& matProj) = 0;
    virtual void setMatVP(const QMatrix4x4& matView, const QMatrix4x4& matProj) { setMatView(matView); setMatProj(matProj); }

    virtual std::shared_ptr<GLuint> texEntry() const = 0;
    virtual std::shared_ptr<GLuint> texExit() const = 0;
};

class RaycastFrustum : public virtual IRaycastFrustum
{
public:
    RaycastFrustum();
    virtual ~RaycastFrustum();

    virtual int texWidth() const { return _texWidth; }
    virtual int texHeight() const { return _texHeight; }
    virtual int volWidth() const { return _volWidth; }
    virtual int volHeight() const { return _volHeight; }
    virtual int volDepth() const { return _volDepth; }
    virtual QMatrix4x4 matModel() const;
    virtual QMatrix4x4 matView() const { return _matView; }
    virtual QMatrix4x4 matProj() const { return _matProj; }

    virtual void setTexSize(int w, int h);
    virtual void setVolSize(int w, int h, int d);
    virtual void setMatView(const QMatrix4x4 &matView);
    virtual void setMatProj(const QMatrix4x4 &matProj);

    virtual std::shared_ptr<GLuint> texEntry() const;
    virtual std::shared_ptr<GLuint> texExit() const;

protected:
    virtual void initializeGL() const;
    virtual void makeEntry() const;
    virtual void makeExit() const;

protected:
    const int _defaultFBOSize = 480;
    mutable std::shared_ptr<Painter> _pCube, _pNear, _pFar;
    mutable std::shared_ptr<GLuint> _entryFBO, _exitFBO;
    mutable std::shared_ptr<GLuint> _entryTex, _exitTex;
    mutable std::shared_ptr<GLuint> _entryRen, _exitRen;
    mutable Shape _plane;
    mutable bool _isFBOUpdated, _isGLInitialized, _isEntryUpdated, _isExitUpdated;
    QMatrix4x4 _matView, _matProj;
    int _texWidth, _texHeight;
    int _volWidth, _volHeight, _volDepth;

private:
    void newFBOs() const;
    void newFBO(int w, int h, std::shared_ptr<GLuint>* fbo, std::shared_ptr<GLuint>* tex, std::shared_ptr<GLuint>* ren) const;
};

class FrustumProgressive : public RaycastFrustum
{
public:
    FrustumProgressive(int level = 0);
    virtual ~FrustumProgressive();

public:
    int progress() const { return _progress; }
    int nProgress() const { return int(std::pow(4, _pgrLevel)); }
    void setProgressLevel(int level);
    int progressLevel() const { return _pgrLevel; }
    void resetProgress();
    bool advance();
    bool finished() const;

protected:
    virtual void initializeGL() const;
    virtual void makeEntry() const;
    virtual void makeExit() const;

private:
    int _progress, _pgrLevel;
};

} // namespace volren
} // namespace yy

#endif // RAYCASTFRUSTUM_H
